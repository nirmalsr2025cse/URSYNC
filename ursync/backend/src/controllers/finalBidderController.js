// src/controllers/finalBidderController.js
//
// Backs the FinalBidder page (src/pages/FinalBidder.jsx), reached from
// the Approvement Bidders tab. Single page, split into two lists purely
// by the isBidderApproved flag on each applications[] entry:
//   - isBidderApproved === false -> "main" list  (Approve button)
//   - isBidderApproved === true  -> "final" list (Reject button)
//
// Routes:
//   GET   /api/finalbidders/by-tender/:tenderCode
//         returns EVERY application snapshot for the tender (frontend
//         splits into main/final lists itself using isBidderApproved).
//   GET   /api/finalbidders/by-tender/:tenderCode/application/:applicationId
//         single fully-expanded application -> BidderDetails.jsx
//   PATCH /api/finalbidders/:id/approve
//         isBidderApproved: false -> true  (adds to final list)
//   PATCH /api/finalbidders/:id/reject
//         isBidderApproved: true -> false  (removes from final list)
//   PATCH /api/finalbidders/tender/:tenderCode/finalize
//         locks the tender: Tender.isFinalizedBidders = true
//   GET   /api/finalbidders/file/:fileId
//         streams a document/signature out of GridFS

const mongoose = require('mongoose')
const FinalBidders = require('../models/FinalBidders')
const Tender = require('../models/Tender')
const User = require('../models/User')
const { getBucket } = require('../config/gridfs')

async function loadCurrentUser(req) {
  const currentUser = req.user
  if (!currentUser) return null
  return User.findById(currentUser._id || currentUser.id)
}

// Shapes one applications[] subdocument (+ parent tender context) into the
// flat object FinalBidderCard.jsx expects. Used for BOTH the main list and
// the final list — same shape either way, since which list a card belongs
// to is decided purely by isBidderApproved on the frontend.
function formatFinalApplication(app, tenderCtx) {
  const formData = app.formData || {}
  const user = app.userId && typeof app.userId === 'object' ? app.userId : null
  const applicationIdStr = app.applicationId ? app.applicationId.toString() : null

  return {
    recordId: applicationIdStr,
    applicationId: applicationIdStr,

    tenderId: tenderCtx.tenderId,
    tenderCode: tenderCtx.tenderCode,
    tenderTitle: tenderCtx.title || '',

    applicantName:
      formData.applicantName ||
      formData.fullName ||
      user?.name ||
      user?.fullName ||
      'Unnamed Applicant',

    companyName: formData.companyName || formData.firmName || '',
    bidAmount: formData.bidAmount ?? formData.bidderQuotedAmount ?? formData.quotedAmount ?? 0,
    experience: formData.experience || formData.yearsOfExperience || '',
    district: formData.district || user?.district || '',
    mobile: formData.mobile || formData.phone || user?.mobile || '',
    email: formData.email || user?.email || '',

    documents: (app.documents || []).map((d) => d.originalName || d.label).filter(Boolean),
    documentCount: (app.documents || []).length,

    submittedDate: app.applicationSubmissionDateTime || app.createdAt || null,

    status: app.isBidderApproved
      ? 'Approved'
      : app.isDocumentApproved
      ? 'Document Verified'
      : 'Submitted',

    isDocumentApproved: !!app.isDocumentApproved,
    isBidderApproved: !!app.isBidderApproved,
  }
}

// Full-detail shape for a single application — used by BidderDetails.jsx.
function formatFinalApplicationDetails(app, tenderCtx) {
  const formData = app.formData || {}
  const user = app.userId && typeof app.userId === 'object' ? app.userId : null
  const applicationIdStr = app.applicationId ? app.applicationId.toString() : null

  const documents = (app.documents || []).map((d) => ({
    fileId: d.fileId ? d.fileId.toString() : null,
    label: d.label,
    originalName: d.originalName || d.label,
    contentType: d.contentType,
    size: d.size || 0,
    url: d.fileId ? `/finalbidders/file/${d.fileId.toString()}` : null,
  }))

  const signature = app.signatureFileId
    ? {
        fileId: app.signatureFileId.toString(),
        contentType: app.signatureContentType || null,
        originalName: app.signatureOriginalName || 'signature',
        url: `/finalbidders/file/${app.signatureFileId.toString()}`,
      }
    : null

  return {
    recordId: applicationIdStr,
    applicationId: applicationIdStr,

    tenderId: tenderCtx.tenderId,
    tenderCode: tenderCtx.tenderCode,
    tenderTitle: tenderCtx.title || '',
    tenderDepartment: tenderCtx.department || '',
    tenderValue: tenderCtx.value,
    tenderCurrency: tenderCtx.currency || 'INR',

    applicantName:
      formData.applicantName || formData.fullName || user?.name || user?.fullName || 'Unnamed Applicant',
    companyName: formData.companyName || formData.firmName || '',
    mobile: formData.mobile || formData.phone || user?.mobile || '',
    email: formData.email || user?.email || '',
    district: formData.district || user?.district || '',
    experience: formData.experience || formData.yearsOfExperience || '',
    bidAmount: formData.bidAmount ?? formData.bidderQuotedAmount ?? formData.quotedAmount ?? 0,

    formData,
    documents,
    signature,

    isPaid: !!app.isPaid,
    paymentId: app.paymentId || null,
    paidAt: app.paidAt || null,
    applicationDate: app.applicationDate || null,
    submittedDate: app.applicationSubmissionDateTime || app.createdAt || null,

    isDocumentApproved: !!app.isDocumentApproved,
    isBidderApproved: !!app.isBidderApproved,
    status: app.isBidderApproved ? 'Approved' : app.isDocumentApproved ? 'Document Verified' : 'Submitted',
  }
}

async function loadTenderCtx(tender) {
  return {
    tenderId: tender._id.toString(),
    tenderCode: tender.tenderCode,
    title: tender.title,
  }
}

// ── GET /api/finalbidders/by-tender/:tenderCode ─────────────────────────────
// Always returns EVERY application for the tender. The frontend splits
// them into the main list (isBidderApproved: false) and the final list
// (isBidderApproved: true) itself — that single field is the only source
// of truth for which list a card is in.
exports.getBidderApplications = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const { tenderCode } = req.params
    if (!tenderCode) {
      return res.status(400).json({ success: false, message: 'tenderCode is required.' })
    }

    const tender = await Tender.findOne({ tenderCode, isDeleted: false }).lean()
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' })
    }

    const finalBidders = await FinalBidders.findOne({ tenderId: tender._id })
      .populate('applications.userId', 'name fullName email mobile district')
      .lean()

    const tenderCtx = await loadTenderCtx(tender)

    const applications = (finalBidders?.applications || [])
      .map((app) => formatFinalApplication(app, tenderCtx))
      .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))

    return res.status(200).json({
      success: true,
      tender: {
        recordId: tender._id.toString(),
        tenderCode: tender.tenderCode,
        title: tender.title,
        applicationDeadline: tender.applicationDeadline,
        isFinalizedBidders: tender.isFinalizedBidders,
      },
      count: applications.length,
      data: applications,
    })
  } catch (err) {
    console.error('getBidderApplications error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/finalbidders/by-tender/:tenderCode/application/:applicationId ──
exports.getFinalBidderApplicationDetails = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const { tenderCode, applicationId } = req.params
    if (!tenderCode || !applicationId) {
      return res.status(400).json({ success: false, message: 'tenderCode and applicationId are required.' })
    }

    const tender = await Tender.findOne({ tenderCode, isDeleted: false })
      .populate('departmentId', 'name')
      .lean()
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' })
    }

    const finalBidders = await FinalBidders.findOne({ tenderId: tender._id })
      .populate('applications.userId', 'name fullName email mobile district')
      .lean()
    if (!finalBidders) {
      return res.status(404).json({ success: false, message: 'No bidder applications found for this tender.' })
    }

    const entry = finalBidders.applications.find(
      (a) => a.applicationId && a.applicationId.toString() === applicationId
    )
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Bidder application not found.' })
    }

    const tenderCtx = {
      tenderId: tender._id.toString(),
      tenderCode: tender.tenderCode,
      title: tender.title,
      department: tender.departmentId?.name || '—',
      value: tender.estimatedValue ?? null,
      currency: tender.currency || 'INR',
    }

    return res.status(200).json({
      success: true,
      data: formatFinalApplicationDetails(entry, tenderCtx),
    })
  } catch (err) {
    console.error('getFinalBidderApplicationDetails error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/finalbidders/file/:fileId ───────────────────────────────────────
exports.streamFinalBidderFile = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const { fileId } = req.params
    if (!mongoose.isValidObjectId(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file id.' })
    }

    const bucket = getBucket()
    const _id = new mongoose.Types.ObjectId(fileId)

    const files = await bucket.find({ _id }).toArray()
    if (!files.length) {
      return res.status(404).json({ success: false, message: 'File not found.' })
    }
    const fileDoc = files[0]

    res.set('Content-Type', fileDoc.contentType || 'application/octet-stream')
    res.set('Content-Length', fileDoc.length)
    res.set(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileDoc.metadata?.originalName || fileDoc.filename)}"`
    )

    const downloadStream = bucket.openDownloadStream(_id)
    downloadStream.on('error', (err) => {
      console.error('streamFinalBidderFile stream error:', err)
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to stream file.' })
      }
    })
    downloadStream.pipe(res)
  } catch (err) {
    console.error('streamFinalBidderFile error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── Shared helper for approve/reject: locate the parent FinalBidders doc
// by the embedded applications.applicationId, and the specific entry. ──────
async function findApplicationEntry(id) {
  const finalBidders = await FinalBidders.findOne({ 'applications.applicationId': id })
  if (!finalBidders) return { finalBidders: null, entry: null }
  const entry = finalBidders.applications.find(
    (a) => a.applicationId && a.applicationId.toString() === id
  )
  return { finalBidders, entry }
}

// ── PATCH /api/finalbidders/:id/approve ─────────────────────────────────────
// isBidderApproved: false -> true. Moves the card from the main list into
// the final list.
exports.approveBidderApplication = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const { id } = req.params
    if (!id) {
      return res.status(400).json({ success: false, message: 'Application id is required.' })
    }

    const { finalBidders, entry } = await findApplicationEntry(id)
    if (!finalBidders || !entry) {
      return res.status(404).json({ success: false, message: 'Bidder application not found.' })
    }

    if (entry.isBidderApproved) {
      return res.status(409).json({ success: false, message: 'This bidder is already in the final list.' })
    }

    entry.isBidderApproved = true
    await finalBidders.save()

    const tender = await Tender.findById(finalBidders.tenderId).lean()
    const tenderCtx = tender
      ? await loadTenderCtx(tender)
      : { tenderId: finalBidders.tenderId.toString(), tenderCode: '', title: '' }

    return res.status(200).json({
      success: true,
      data: formatFinalApplication(entry.toObject ? entry.toObject() : entry, tenderCtx),
    })
  } catch (err) {
    console.error('approveBidderApplication error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/finalbidders/:id/reject ──────────────────────────────────────
// isBidderApproved: true -> false. Removes the card from the final list,
// sends it back to the main list. Cannot reject a tender whose bidders
// have already been finalized (Tender.isFinalizedBidders === true) — the
// list is locked at that point.
exports.rejectBidderApplication = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const { id } = req.params
    if (!id) {
      return res.status(400).json({ success: false, message: 'Application id is required.' })
    }

    const { finalBidders, entry } = await findApplicationEntry(id)
    if (!finalBidders || !entry) {
      return res.status(404).json({ success: false, message: 'Bidder application not found.' })
    }

    if (!entry.isBidderApproved) {
      return res.status(409).json({ success: false, message: 'This bidder is not in the final list.' })
    }

    const tender = await Tender.findById(finalBidders.tenderId).lean()
    if (tender?.isFinalizedBidders) {
      return res.status(409).json({
        success: false,
        message: 'Bidders for this tender are already finalized and can no longer be changed.',
      })
    }

    entry.isBidderApproved = false
    await finalBidders.save()

    const tenderCtx = tender
      ? await loadTenderCtx(tender)
      : { tenderId: finalBidders.tenderId.toString(), tenderCode: '', title: '' }

    return res.status(200).json({
      success: true,
      data: formatFinalApplication(entry.toObject ? entry.toObject() : entry, tenderCtx),
    })
  } catch (err) {
    console.error('rejectBidderApplication error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/finalbidders/tender/:tenderCode/finalize ─────────────────────
// Locks the tender's bidder list: Tender.isFinalizedBidders = true.
// Requires at least one bidder already in the final list
// (isBidderApproved === true). Once finalized, approve/reject on this
// tender's applications is blocked (see rejectBidderApplication above —
// wire the same guard into approve if you want it locked both ways).
exports.finalizeBidders = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const { tenderCode } = req.params
    if (!tenderCode) {
      return res.status(400).json({ success: false, message: 'tenderCode is required.' })
    }

    const tender = await Tender.findOne({ tenderCode, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' })
    }

    if (tender.isFinalizedBidders) {
      return res.status(409).json({ success: false, message: 'Bidders for this tender are already finalized.' })
    }

    const finalBidders = await FinalBidders.findOne({ tenderId: tender._id }).lean()
    const approvedCount = (finalBidders?.applications || []).filter((a) => a.isBidderApproved).length

    if (approvedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one bidder to the final list before finalizing.',
      })
    }

    tender.isFinalizedBidders = true
    await tender.save()

    return res.status(200).json({
      success: true,
      message: 'Bidders finalized successfully.',
      data: { tenderCode: tender.tenderCode, isFinalizedBidders: true, finalizedCount: approvedCount },
    })
  } catch (err) {
    console.error('finalizeBidders error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}