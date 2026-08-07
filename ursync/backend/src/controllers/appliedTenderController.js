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
    closingDate: tender.closingDate,
    startDate: tender.startDate,
    status: tender.status,
    application: tender.application,
    isCancelled: tender.isCancelled,
    isRetendered: tender.isRetendered,
  }
}

// Applied-Tenders-page status bucketing:
//   'applied'   -> tender.status is Ongoing/Upcoming (still active/in-progress)
//   'completed' -> tender.status is Completed
// (Independent of BiddersList.status, which just tracks
// Submitted/Paid — an applied tender stays "applied" until the underlying
// tender itself completes.)
function bucketFor(tenderStatus) {
  return tenderStatus === 'Completed' ? 'completed' : 'applied'
}

// ── GET /api/applied-tenders?tab=applied|completed ─────────────────────────
// Lists the current user's submitted applications for the AppliedTenders.jsx
// grid. Joins BiddersList -> Tender -> Department in one aggregation so the
// frontend gets card-ready objects, same shape as MOCK_APPLIED_TENDERS /
// MOCK_COMPLETED_APPLIED did before.
exports.listAppliedTenders = async (req, res) => {
  try {
    const userId = req.user.id
    const tab = req.query.tab === 'completed' ? 'completed' : 'applied'

    const records = await BiddersList.find({ userId })
      .populate('tenderId')
      .populate('departmentId', 'name')
      .sort({ applicationSubmissionDateTime: -1 })
      .lean()

    const shaped = records
      .filter((r) => r.tenderId) // tender may have been hard-deleted; skip orphans defensively
      .map((r) => {
        const tenderSummary = shapeTenderSummary(r.tenderId, r.departmentId?.name)
        return {
          ...tenderSummary,
          applicationId: r.applicationId,
          appliedDate: toYMD(r.applicationSubmissionDateTime),
          applicantName: r.formData?.applicantName || '',
          companyName: r.formData?.companyName || '',
          companyRegNo: r.formData?.companyRegNo || '',
          gstNumber: r.formData?.gstNumber || '',
          panNumber: r.formData?.panNumber || '',
          email: r.formData?.email || '',
          mobile: r.formData?.mobile || '',
          address: r.formData?.address || '',
          district: r.formData?.district || '',
          pinCode: r.formData?.pinCode || '',
          bidAmount: r.formData?.bidAmount || '',
          declarationDate: r.formData?.declarationDate || '',
          applicationStatus: r.status, // Submitted / Paid
          tenderStatus: r.tenderId.status,
        }
      })
      .filter((r) => bucketFor(r.tenderStatus) === tab)

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
exports.getAppliedTenderForEdit = async (req, res) => {
  try {
    const userId = req.user.id
    const { applicationId } = req.params

    const record = await BiddersList.findOne({ applicationId, userId })
      .populate('tenderId')
      .populate('departmentId', 'name')
      .lean()

    if (!record) {
      return res.status(404).json({ message: 'Application not found.' })
    }

    const documents = (record.documents || []).map((d) => ({
      label: d.label,
      url: `/applied-tenders/file/${d.fileId}`,
      originalName: d.originalName,
      contentType: d.contentType,
    }))

    res.json({
      data: {
        applicationId: record.applicationId,
        formData: record.formData || {},
        documents,
        signatureUrl: record.signatureFileId
          ? `/applied-tenders/file/${record.signatureFileId}`
          : null,
        signatureContentType: record.signatureContentType || null,
        signatureOriginalName: record.signatureOriginalName || null,
        tender: shapeTenderSummary(record.tenderId, record.departmentId?.name),
        applicationStatus: record.status,
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

    const record = await BiddersList.findOne({ applicationId, userId })
    if (!record) {
      return res.status(404).json({ message: 'Application not found.' })
    }

    // ── 1. Update text fields ────────────────────────────────────────────
    if (req.body.formData) {
      try {
        const parsed = JSON.parse(req.body.formData)
        record.formData = { ...record.formData, ...parsed }
      } catch (e) {
        return res.status(400).json({ message: 'Invalid formData payload.' })
      }
    }

    // ── 2. Replace any documents that came with a new file ─────────────
    const files = req.files || [] // expects multer .any() upstream
    for (const file of files) {
      if (file.fieldname === 'signature') continue

      const label = file.fieldname
      const existingIdx = (record.documents || []).findIndex((d) => d.label === label)
      const oldFileId = existingIdx !== -1 ? record.documents[existingIdx].fileId : null

      const uploadStream = gfsBucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
        metadata: { userId, tenderId: record.tenderId, applicationId, label },
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
        record.documents[existingIdx] = newDoc
      } else {
        record.documents.push(newDoc)
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
      const oldSignatureId = record.signatureFileId

      const uploadStream = gfsBucket.openUploadStream(signatureFile.originalname, {
        contentType: signatureFile.mimetype,
        metadata: { userId, tenderId: record.tenderId, applicationId, label: 'signature' },
      })
      uploadStream.end(signatureFile.buffer)
      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve)
        uploadStream.on('error', reject)
      })

      record.signatureFileId = uploadStream.id
      record.signatureContentType = signatureFile.mimetype
      record.signatureOriginalName = signatureFile.originalname

      if (oldSignatureId) {
        gfsBucket.delete(oldSignatureId).catch(() => {})
      }
    }

    await record.save()

    res.json({ message: 'Application updated successfully.', data: { applicationId: record.applicationId } })
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