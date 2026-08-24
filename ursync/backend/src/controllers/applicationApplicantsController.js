// src/controllers/applicationApplicantsController.js
//
// Serves the "Applicants" screens for a single tender. Source of truth for
// "has this bidder been approved" is the isDocumentApproved flag on the
// applications[] entry inside BiddersList (see src/models/BiddersList.js).
// approve() flips it true, reject() flips it back false — nothing else
// about the record changes, and the record is never deleted either way.
//
// sendToDepartment() is the final step: it copies every currently-approved
// applications[] entry into a FinalBidders document (see
// src/models/FinalBidders.js) and flips Tender.isDocumentVerified to true,
// which moves the tender into the Completed tab on the Applications page
// (see tenderListController.js). It also emails every approved applicant a
// "selected" notice, and every applicant left behind in bidderlists
// (isDocumentApproved !== true) a "not selected" notice — see
// services/applicantNotificationService.js.
//
//   GET   /api/tenders/applications/applicants?tenderCode=...&approved=false
//   GET   /api/tenders/applications/applicants/:applicationId
//   PATCH /api/tenders/applications/applicants/:applicationId/approve
//   PATCH /api/tenders/applications/applicants/:applicationId/reject
//   PATCH /api/tenders/applications/applicants/send-to-department

const Tender = require('../models/Tender')
const BiddersList = require('../models/BiddersList')
const FinalBidders = require('../models/FinalBidders')
const { notifySelected, notifyNotSelected } = require('../services/applicantNotificationService')

function formatTenderSummary(t) {
  return {
    id: t.tenderCode,
    _id: t._id.toString(),
    title: t.title,
    department: t.departmentId?.name || '—',
    district: t.districtId?.name || '—',
    value: t.estimatedValue,
    currency: t.currency || 'INR',
  }
}

// NOTE: applicantName/companyName/experience/district aren't top-level
// fields on the applications[] entry — they live inside formData because
// the apply form is dynamic per tender. Adjust the fd.* keys below to match
// whatever field names ApplyTenderForm.jsx actually submits.
function formatApplicant(entry) {
  const fd = entry.formData || {}
  return {
    applicationId: entry.applicationId.toString(),
    userId: entry.userId?.toString ? entry.userId.toString() : entry.userId,
    applicantName: fd.applicantName || fd.name || '—',
    companyName: fd.companyName || fd.firmName || '—',
    experience: fd.experience || '—',
    district: fd.district || '—',
    submittedDate: entry.applicationSubmissionDateTime,
    isPaid: entry.isPaid,
    isDocumentApproved: entry.isDocumentApproved,
    isBidderApproved: entry.isBidderApproved,
    documents: (entry.documents || []).map((d) => ({
      fileId: d.fileId.toString(),
      label: d.label,
      originalName: d.originalName,
      contentType: d.contentType,
      size: d.size,
      url: `/temp-applications/file/${d.fileId}`,
    })),
    signature: entry.signatureFileId
      ? {
          fileId: entry.signatureFileId.toString(),
          contentType: entry.signatureContentType,
          originalName: entry.signatureOriginalName,
          url: `/temp-applications/file/${entry.signatureFileId}`,
        }
      : null,
    formData: fd,
  }
}

// ── GET /api/tenders/applications/applicants?tenderCode=...&approved=false ─
// approved: 'false' (default) -> pending list (isDocumentApproved !== true)
//           'true'            -> approved list
//           'all'             -> everything
exports.getApplicants = async (req, res) => {
  try {
    const { tenderCode } = req.query
    const approvedParam = (req.query.approved || 'false').toLowerCase()

    if (!tenderCode) {
      return res.status(400).json({ success: false, message: 'tenderCode is required' })
    }

    const tender = await Tender.findOne({ tenderCode, isDeleted: false })
      .populate('departmentId', 'name')
      .populate('districtId', 'name')
      .lean()

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const biddersList = await BiddersList.findOne({ tenderId: tender._id }).lean()
    const allApplications = biddersList?.applications || []

    let filtered
    if (approvedParam === 'true') {
      filtered = allApplications.filter((a) => a.isDocumentApproved === true)
    } else if (approvedParam === 'all') {
      filtered = allApplications
    } else {
      filtered = allApplications.filter((a) => a.isDocumentApproved !== true)
    }

    return res.status(200).json({
      success: true,
      data: {
        tender: formatTenderSummary(tender),
        applicants: filtered.map(formatApplicant),
      },
    })
  } catch (err) {
    console.error('getApplicants error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/tenders/applications/applicants/:applicationId ────────────────
exports.getApplicantDetails = async (req, res) => {
  try {
    const { applicationId } = req.params

    const biddersList = await BiddersList.findOne({
      'applications.applicationId': applicationId,
    }).lean()

    if (!biddersList) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }

    const entry = biddersList.applications.find(
      (a) => a.applicationId.toString() === applicationId
    )
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }

    const tender = await Tender.findById(biddersList.tenderId)
      .populate('departmentId', 'name')
      .populate('districtId', 'name')
      .lean()

    return res.status(200).json({
      success: true,
      data: {
        tender: formatTenderSummary(tender),
        applicant: formatApplicant(entry),
      },
    })
  } catch (err) {
    console.error('getApplicantDetails error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// Shared updater — approve/reject both just flip isDocumentApproved on the
// matching applications[] entry using Mongo's positional $ operator.
async function setDocumentApproved(applicationId, value) {
  return BiddersList.findOneAndUpdate(
    { 'applications.applicationId': applicationId },
    { $set: { 'applications.$.isDocumentApproved': value } },
    { returnDocument: 'after' }
  ).lean()
}

// ── PATCH /api/tenders/applications/applicants/:applicationId/approve ──────
exports.approveApplicant = async (req, res) => {
  try {
    const updated = await setDocumentApproved(req.params.applicationId, true)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }
    return res.status(200).json({ success: true, message: 'Applicant approved' })
  } catch (err) {
    console.error('approveApplicant error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/tenders/applications/applicants/:applicationId/reject ───────
// "Reject" = send the applicant back to the pending list (un-approve their
// documents). It never deletes the application record.
exports.rejectApplicant = async (req, res) => {
  try {
    const updated = await setDocumentApproved(req.params.applicationId, false)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }
    return res.status(200).json({ success: true, message: 'Applicant moved back to pending' })
  } catch (err) {
    console.error('rejectApplicant error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/tenders/applications/applicants/send-to-department ──────────
// Body: { tenderCode }
//
// Final step of the review flow: takes every applications[] entry on this
// tender's BiddersList that currently has isDocumentApproved === true,
// copies them (full field-for-field snapshot) into a FinalBidders
// document, and flips Tender.isDocumentVerified to true — which is what
// moves the tender into the Completed tab (see tenderListController.js).
//
// If a FinalBidders document already exists for this tender (e.g. the
// action is retried), it's overwritten with the current approved set
// rather than duplicated.
//
// Email notifications (best-effort, never blocks the response):
//   - every entry copied into FinalBidders  -> "selected" mail
//   - every remaining bidderlists entry that is NOT approved
//     (isDocumentApproved !== true)         -> "not selected" mail
exports.sendToDepartment = async (req, res) => {
  try {
    const { tenderCode } = req.body

    if (!tenderCode) {
      return res.status(400).json({ success: false, message: 'tenderCode is required' })
    }

    const tender = await Tender.findOne({ tenderCode, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const biddersList = await BiddersList.findOne({ tenderId: tender._id }).lean()
    const allApplications = biddersList?.applications || []
    const approvedApplications = allApplications.filter((a) => a.isDocumentApproved === true)
    const notSelectedApplications = allApplications.filter((a) => a.isDocumentApproved !== true)

    if (approvedApplications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No approved applicants to send for this tender',
      })
    }

    await FinalBidders.findOneAndUpdate(
      { tenderId: tender._id },
      {
        tenderId: tender._id,
        departmentId: tender.departmentId,
        applications: approvedApplications,
        sentAt: new Date(),
        sentBy: req.user?._id || null, // adjust if your auth middleware names this differently
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )

    tender.isDocumentVerified = true
    await tender.save()

    // ── Notify applicants ─────────────────────────────────────────────
    // Best-effort — a mail failure must never turn a successful
    // send-to-department action into an error response. Fired in
    // parallel; each notify* call already swallows its own errors (see
    // applicantNotificationService.js).
    try {
      await Promise.all([
        ...approvedApplications.map((entry) => notifySelected(tender, entry)),
        ...notSelectedApplications.map((entry) => notifyNotSelected(tender, entry)),
      ])
    } catch (mailErr) {
      console.error('sendToDepartment: applicant notification batch failed:', mailErr)
    }

    return res.status(200).json({
      success: true,
      message: 'Sent to department successfully',
      data: { finalizedCount: approvedApplications.length },
    })
  } catch (err) {
    console.error('sendToDepartment error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}