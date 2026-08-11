// src/controllers/appliedTenderController.js
//
// Backend for the "Applied Tenders" page (AppliedTenders.jsx) and the
// "Edit Tender" flow that reuses ApplyTenderForm.jsx in edit mode.
//
// Data sources:
//   - bidderlists              (BiddersList model)   -> the submitted application record
//   - tenders                  (Tender model)         -> tender/project info for the card + read-only Section 2
//   - departments               (Department model)     -> department display name
//   - bidderDocuments.files/.chunks (GridFS bucket)   -> uploaded PAN/GST/etc. + signature files
//
// Every route is scoped to req.user.id (set by authMiddleware) so a bidder
// can only ever see/edit/download their OWN applications.

const mongoose = require('mongoose')
const BiddersList = require('../models/BiddersList')
const Tender = require('../models/Tender')
const Department = require('../models/Department')

// ── GridFS bucket for bidder-uploaded documents ────────────────────────────
// Files are written here by the (existing) temp-applications upload flow,
// with metadata: { userId, tenderId, applicationId, label }.
let bucket = null
function getBucket() {
  if (!bucket) {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'bidderDocuments',
    })
  }
  return bucket
}

// ── Helpers ─────────────────────────────────────────────────────────────
function toYMD(date) {
  if (!date) return ''
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Maps a Tender + its resolved Department name into the same shape
// TenderCard.jsx / the local mock data in AppliedTenders.jsx already
// expects (id, title, department, category, location, deadline, status...).
function shapeTenderSummary(tender, departmentName) {
  if (!tender) return {}
  return {
    id: tender.tenderCode,
    _id: tender._id,
    title: tender.title,
    description: tender.description,
    image: tender.image,
    department: departmentName || '',
    category: tender.procurementType || '',
    location: tender.location,
    projectDuration: tender.duration,
    estimatedValue: tender.estimatedValue,
    applicationDeadline: tender.applicationDeadline,
    applicationEndDate: tender.applicationEndDate,
    closingDate: tender.closingDate,
    startDate: tender.startDate,
    status: tender.status,
    application: tender.application,
    isCancelled: tender.isCancelled,
    isRetendered: tender.isRetendered,
  }
}

// ── Applied-Tenders-page tab bucketing ──────────────────────────────────
// Purely date-driven now, per product requirement: once a tender's
// application window has closed, every applicant's card for it moves to
// the "Completed" tab (View only) — regardless of what Tender.status /
// Tender.application currently say (those drive OTHER pages, e.g. the
// public tender listing, and can lag behind via the cron sync job).
//   - applicationEndDate is the Tender Authority-entered end-of-window date
//     (see Tender model) and is preferred when present.
//   - applicationDeadline is the fallback if applicationEndDate isn't set.
//   - If neither is set, the tender is treated as still open ('applied').
function isApplicationWindowClosed(tender) {
  if (!tender) return false
  const endDate = tender.applicationEndDate || tender.applicationDeadline
  if (!endDate) return false
  return new Date(endDate) < new Date()
}

function bucketFor(tender) {
  return isApplicationWindowClosed(tender) ? 'completed' : 'applied'
}

function resolveApplicantEntry(record, userId, applicationId) {
  const applications = Array.isArray(record?.applications) ? record.applications : []
  if (applicationId) {
    const byAppId = applications.find((entry) => String(entry.applicationId) === String(applicationId))
    if (byAppId) return byAppId
  }
  const byUser = applications.find((entry) => String(entry.userId) === String(userId))
  if (byUser) return byUser

  if (applicationId && String(record?.applicationId) === String(applicationId)) {
    return {
      applicationId: record.applicationId,
      userId: record.userId,
      formData: record.formData || {},
      documents: record.documents || [],
      signatureFileId: record.signatureFileId || null,
      signatureContentType: record.signatureContentType || null,
      signatureOriginalName: record.signatureOriginalName || null,
      isPaid: Boolean(record.isPaid),
      paymentId: record.paymentId || null,
      paidAt: record.paidAt || null,
      applicationDate: record.applicationDate,
      applicationTime: record.applicationTime,
      applicationSubmissionDateTime: record.applicationSubmissionDateTime,
    }
  }

  if (record?.userId && String(record.userId) === String(userId)) {
    return {
      applicationId: record.applicationId,
      userId: record.userId,
      formData: record.formData || {},
      documents: record.documents || [],
      signatureFileId: record.signatureFileId || null,
      signatureContentType: record.signatureContentType || null,
      signatureOriginalName: record.signatureOriginalName || null,
      isPaid: Boolean(record.isPaid),
      paymentId: record.paymentId || null,
      paidAt: record.paidAt || null,
      applicationDate: record.applicationDate,
      applicationTime: record.applicationTime,
      applicationSubmissionDateTime: record.applicationSubmissionDateTime,
    }
  }

  return null
}

function toApplicationCardShape(record, userId, applicationId) {
  const entry = resolveApplicantEntry(record, userId, applicationId)
  if (!entry) return null

  const tenderSummary = shapeTenderSummary(record.tenderId, record.departmentId?.name)
  return {
    ...tenderSummary,
    applicationId: entry.applicationId,
    groupId: record._id,
    appliedDate: toYMD(entry.applicationSubmissionDateTime || entry.applicationTime || record.applicationSubmissionDateTime),
    applicantName: entry.formData?.applicantName || '',
    companyName: entry.formData?.companyName || '',
    companyRegNo: entry.formData?.companyRegNo || '',
    gstNumber: entry.formData?.gstNumber || '',
    panNumber: entry.formData?.panNumber || '',
    email: entry.formData?.email || '',
    mobile: entry.formData?.mobile || '',
    address: entry.formData?.address || '',
    district: entry.formData?.district || '',
    pinCode: entry.formData?.pinCode || '',
    bidAmount: entry.formData?.bidAmount || '',
    declarationDate: entry.formData?.declarationDate || '',
    applicationStatus: entry.isPaid ? 'Paid' : 'Submitted',
    tenderStatus: record.tenderId?.status,
    // Tab this card belongs to, computed straight from the application
    // window dates — the frontend also relies on this for the Edit-button
    // visibility rule (only 'applied' tenders may be edited).
    tabBucket: bucketFor(record.tenderId),
  }
}

// ── GET /api/applied-tenders?tab=applied|completed ─────────────────────────
// Lists the current user's submitted applications for the AppliedTenders.jsx
// grid. Each tender document can contain many applications, so we resolve
// the current user's entry inside that array instead of assuming a one-row-per-user model.
//
// Tab placement is date-driven (see bucketFor/isApplicationWindowClosed
// above): once a tender's application window has closed, its card always
// lands in "completed", where the frontend shows View only (no Edit).
exports.listAppliedTenders = async (req, res) => {
  try {
    const userId = req.user.id
    const tab = req.query.tab === 'completed' ? 'completed' : 'applied'

    const records = await BiddersList.find({ 'applications.userId': userId })
      .populate('tenderId')
      .populate('departmentId', 'name')
      .sort({ updatedAt: -1 })
      .lean()

    const shaped = records
      .filter((r) => r.tenderId)
      .map((r) => toApplicationCardShape(r, userId))
      .filter(Boolean)
      .filter((r) => r.tabBucket === tab)

    res.json({ data: shaped })
  } catch (err) {
    console.error('listAppliedTenders error:', err)
    res.status(500).json({ message: 'Failed to load applied tenders.' })
  }
}

// ── GET /api/applied-tenders/:applicationId ─────────────────────────────────
// Full record for the Edit flow — pre-fills ApplyTenderForm.jsx exactly like
// the temp-applications draft endpoint does, but sourced from the permanent
// bidderlists collection instead. Document/signature URLs point at the
// authenticated file-stream route below (same pattern the form already uses
// for existingUrl / ImageUploadBox).
//
// NOTE: editing a Completed-tab (application window closed) application is
// rejected here too, as a server-side backstop to the frontend only
// rendering the Edit button on the Applied tab — this endpoint doubles as
// the data source for both the Edit form AND the read-only "View Details"
// screen, so isEditable is returned for the frontend to gate the Save
// button / show Cancel+Save vs. read-only.
exports.getAppliedTenderForEdit = async (req, res) => {
  try {
    const userId = req.user.id
    const { applicationId } = req.params

    const record = await BiddersList.findOne({ 'applications.applicationId': applicationId })
      .populate('tenderId')
      .populate('departmentId', 'name')
      .lean()

    if (!record) {
      return res.status(404).json({ message: 'Application not found.' })
    }

    const entry = resolveApplicantEntry(record, userId, applicationId)
    if (!entry) {
      return res.status(404).json({ message: 'Application not found.' })
    }

    const documents = (entry.documents || []).map((d) => ({
      label: d.label,
      url: `/applied-tenders/file/${d.fileId}`,
      originalName: d.originalName,
      contentType: d.contentType,
    }))

    res.json({
      data: {
        applicationId: entry.applicationId,
        formData: entry.formData || {},
        documents,
        signatureUrl: entry.signatureFileId
          ? `/applied-tenders/file/${entry.signatureFileId}`
          : null,
        signatureContentType: entry.signatureContentType || null,
        signatureOriginalName: entry.signatureOriginalName || null,
        tender: shapeTenderSummary(record.tenderId, record.departmentId?.name),
        applicationStatus: entry.isPaid ? 'Paid' : 'Submitted',
        tabBucket: bucketFor(record.tenderId),
        isEditable: bucketFor(record.tenderId) === 'applied',
      },
    })
  } catch (err) {
    console.error('getAppliedTenderForEdit error:', err)
    res.status(500).json({ message: 'Failed to load application.' })
  }
}

// ── PUT /api/applied-tenders/:applicationId ─────────────────────────────────
// Saves edits made from ApplyTenderForm.jsx in edit mode. multipart/form-data,
// same convention persistDraft() already uses: a `formData` JSON field, plus
// one file field per document label, plus an optional `signature` field.
// Any newly-uploaded file REPLACES the old GridFS file for that label (old
// one is deleted) — mirrors the temp-applications draft-save behavior.
exports.updateAppliedTender = async (req, res) => {
  const gfsBucket = getBucket()
  try {
    const userId = req.user.id
    const { applicationId } = req.params

    const record = await BiddersList.findOne({ 'applications.applicationId': applicationId })
      .populate('tenderId')
    if (!record) {
      return res.status(404).json({ message: 'Application not found.' })
    }

    // Server-side backstop: once the application window has closed, the
    // tender only belongs on the Completed tab (View only) — reject edits
    // even if someone hits this endpoint directly.
    if (bucketFor(record.tenderId) === 'completed') {
      return res.status(403).json({ message: 'This application can no longer be edited — the application window has closed.' })
    }

    const entry = resolveApplicantEntry(record, userId, applicationId)
    if (!entry) {
      return res.status(404).json({ message: 'Application not found.' })
    }

    // ── 1. Update text fields ────────────────────────────────────────────
    if (req.body.formData) {
      try {
        const parsed = JSON.parse(req.body.formData)
        entry.formData = { ...(entry.formData || {}), ...parsed }
      } catch (e) {
        return res.status(400).json({ message: 'Invalid formData payload.' })
      }
    }

    // ── 2. Replace any documents that came with a new file ─────────────
    const files = req.files || [] // expects multer .any() upstream
    for (const file of files) {
      if (file.fieldname === 'signature') continue

      const label = file.fieldname
      const existingIdx = (entry.documents || []).findIndex((d) => d.label === label)
      const oldFileId = existingIdx !== -1 ? entry.documents[existingIdx].fileId : null

      const uploadStream = gfsBucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
        metadata: { userId, tenderId: record.tenderId, applicationId: entry.applicationId, label },
      })
      uploadStream.end(file.buffer)
      const newFileId = uploadStream.id

      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve)
        uploadStream.on('error', reject)
      })

      const newDoc = {
        label,
        fileId: newFileId,
        originalName: file.originalname,
        contentType: file.mimetype,
        size: file.size,
      }
      if (existingIdx !== -1) {
        entry.documents[existingIdx] = newDoc
      } else {
        entry.documents.push(newDoc)
      }

      if (oldFileId) {
        gfsBucket.delete(oldFileId).catch(() => {
          // Old file already gone / inconsistent — non-fatal.
        })
      }
    }

    // ── 3. Replace signature, if a new one was uploaded ─────────────────
    const signatureFile = files.find((f) => f.fieldname === 'signature')
    if (signatureFile) {
      const oldSignatureId = entry.signatureFileId

      const uploadStream = gfsBucket.openUploadStream(signatureFile.originalname, {
        contentType: signatureFile.mimetype,
        metadata: { userId, tenderId: record.tenderId, applicationId: entry.applicationId, label: 'signature' },
      })
      uploadStream.end(signatureFile.buffer)
      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve)
        uploadStream.on('error', reject)
      })

      entry.signatureFileId = uploadStream.id
      entry.signatureContentType = signatureFile.mimetype
      entry.signatureOriginalName = signatureFile.originalname

      if (oldSignatureId) {
        gfsBucket.delete(oldSignatureId).catch(() => {})
      }
    }

    record.markModified('applications')
    await record.save()

    res.json({ message: 'Application updated successfully.', data: { applicationId: entry.applicationId } })
  } catch (err) {
    console.error('updateAppliedTender error:', err)
    res.status(500).json({ message: 'Failed to update application.' })
  }
}

// ── GET /applied-tenders/file/:fileId ───────────────────────────────────────
// Authenticated GridFS stream for a document/signature belonging to the
// current user's application — mirrors the existing temp-applications file
// route. Ownership is verified via the file's own metadata.userId, so a
// user cannot fetch another bidder's file by guessing a fileId.
exports.streamAppliedTenderFile = async (req, res) => {
  try {
    const userId = req.user.id
    const { fileId } = req.params

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Invalid file id.' })
    }

    const gfsBucket = getBucket()
    const _id = new mongoose.Types.ObjectId(fileId)
    const filesColl = mongoose.connection.db.collection('bidderDocuments.files')
    const fileDoc = await filesColl.findOne({ _id })

    if (!fileDoc) {
      return res.status(404).json({ message: 'File not found.' })
    }
    if (String(fileDoc.metadata?.userId) !== String(userId)) {
      return res.status(403).json({ message: 'You do not have access to this file.' })
    }

    res.set('Content-Type', fileDoc.contentType || 'application/octet-stream')
    if (fileDoc.filename) {
      res.set('Content-Disposition', `inline; filename="${fileDoc.filename}"`)
    }

    const downloadStream = gfsBucket.openDownloadStream(_id)
    downloadStream.on('error', () => res.status(404).end())
    downloadStream.pipe(res)
  } catch (err) {
    console.error('streamAppliedTenderFile error:', err)
    res.status(500).json({ message: 'Failed to load file.' })
  }
}