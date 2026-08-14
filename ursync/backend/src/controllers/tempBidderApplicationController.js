// src/controllers/tempBidderApplicationController.js
const mongoose = require('mongoose')
const TempBidderApplication = require('../models/TempBidderApplication')
const Tender = require('../models/Tender')
const BiddersList = require('../models/BiddersList')
const { getBucket, uploadBufferToGridFS, deleteGridFSFileSafe } = require('../config/gridfs')

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']

// ── Save (create-or-update) the current user's in-progress application ────
// IMPORTANT: files are written to GridFS ONLY inside this handler — i.e.
// only when the user actually clicks "Save" (or "Next", which also calls
// this same persist flow). Nothing is uploaded to MongoDB on page load or
// while the user is just typing/picking files client-side; the browser
// holds those in memory until this endpoint is hit.
//
// Expects multipart/form-data:
//   - field "formData": JSON string of the text fields
//   - files: one per document label (field name = the label) + "signature"
exports.saveApplication = async (req, res) => {
  try {
    const { tenderId } = req.params
    const userId = req.user._id

    const tender = await Tender.findById(tenderId).select('_id departmentId')
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' })
    }

    let formData = {}
    try {
      formData = req.body.formData ? JSON.parse(req.body.formData) : {}
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid formData JSON.' })
    }

    let tempDoc = await TempBidderApplication.findOne({ tenderId })
    if (!tempDoc) {
      tempDoc = new TempBidderApplication({
        tenderId,
        departmentId: tender.departmentId,
        applications: [],
      })
    }

    const existingEntry = tempDoc.applications.find(
      (a) => String(a.userId) === String(userId)
    )

    // The id that maps this bidder's documents/signature to this exact
    // tender application — generated once and then reused for every
    // subsequent Save/Next, and later carried over unchanged into the
    // bidderlists collection when the application is submitted.
    const applicationId = existingEntry ? existingEntry.applicationId : new mongoose.Types.ObjectId()

    // req.files is an object keyed by fieldname when using multer.fields()
    // with memoryStorage — each entry has a .buffer, nothing touches disk.
    const files = req.files || {}
    const newDocuments = []
    let newSignature = null

    for (const fieldName of Object.keys(files)) {
      const uploaded = files[fieldName] && files[fieldName][0]
      if (!uploaded) continue

      if (!ALLOWED_MIME_TYPES.includes(uploaded.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported file type for "${fieldName}". Only JPG, PNG, or PDF allowed.`,
        })
      }

      const fileId = await uploadBufferToGridFS(
        uploaded.buffer,
        `${fieldName}-${userId}-${Date.now()}`,
        uploaded.mimetype,
        {
          // Full mapping stored directly on the GridFS file document
          // (bidderDocuments.files.metadata) — traceable to the bidder,
          // the tender, AND the specific application it was uploaded for,
          // without a second lookup. Visible directly in Compass/Atlas.
          userId: String(userId),
          tenderId: String(tenderId),
          applicationId: String(applicationId),
          label: fieldName,
          originalName: uploaded.originalname,
        }
      )

      if (fieldName === 'signature') {
        newSignature = {
          fileId,
          contentType: uploaded.mimetype,
          originalName: uploaded.originalname,
        }
      } else {
        newDocuments.push({
          label: fieldName,
          fileId,
          originalName: uploaded.originalname,
          contentType: uploaded.mimetype,
          size: uploaded.size,
        })
      }
    }

    const now = new Date()
    const applicationDate = now.toISOString().slice(0, 10)

    if (existingEntry) {
      // Merge form data (keep previously saved fields not present this time)
      existingEntry.formData = { ...existingEntry.formData, ...formData }

      // Replace any document whose label was re-uploaded this time, deleting
      // the OLD GridFS file first; keep the rest untouched.
      newDocuments.forEach((doc) => {
        const idx = existingEntry.documents.findIndex((d) => d.label === doc.label)
        if (idx >= 0) {
          deleteGridFSFileSafe(existingEntry.documents[idx].fileId)
          existingEntry.documents[idx] = doc
        } else {
          existingEntry.documents.push(doc)
        }
      })

      if (newSignature) {
        deleteGridFSFileSafe(existingEntry.signatureFileId)
        existingEntry.signatureFileId = newSignature.fileId
        existingEntry.signatureContentType = newSignature.contentType
        existingEntry.signatureOriginalName = newSignature.originalName
      }

      existingEntry.applicationTime = now
      existingEntry.applicationDate = applicationDate
    } else {
      tempDoc.applications.push({
        applicationId,
        userId,
        formData,
        documents: newDocuments,
        signatureFileId: newSignature?.fileId || null,
        signatureContentType: newSignature?.contentType || null,
        signatureOriginalName: newSignature?.originalName || null,
        isPaid: false,
        paymentId: null,
        applicationDate,
        applicationTime: now,
      })
    }

    await tempDoc.save()

    return res.status(200).json({ success: true, message: 'Application progress saved.' })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to save application', error: err.message })
  }
}

// ── Load the current user's saved (unpaid) application for this tender ────
// Called when the user enters/reopens the page — READ ONLY, never writes.
// Documents are returned as streaming URLs (/temp-applications/file/:fileId)
// that the frontend can drop straight into <img src> or an <a href> — the
// actual bytes are fetched on demand from GridFS by getFile below, not
// embedded here, so this response stays small even with several PDFs.
exports.getApplication = async (req, res) => {
  try {
    const { tenderId } = req.params
    const userId = req.user._id

    const tempDoc = await TempBidderApplication.findOne(
      { tenderId, 'applications.userId': userId },
      { 'applications.$': 1 }
    ).lean()

    if (!tempDoc || !tempDoc.applications?.length) {
      return res.status(200).json({ success: true, data: null })
    }

    const entry = tempDoc.applications[0]

    // NOTE: no leading "/api" here — the frontend's apiFetch/API_BASE
    // already includes that prefix (same pattern as
    // apiFetch('/temp-applications/...') elsewhere). Returning "/api/..."
    // here doubled the prefix and 404'd once auth was fixed.
    const toFileMeta = (d) => ({
      label: d.label,
      originalName: d.originalName,
      contentType: d.contentType,
      size: d.size,
      url: `/temp-applications/file/${d.fileId}`,
    })

    return res.status(200).json({
      success: true,
      data: {
        applicationId: entry.applicationId,
        formData: entry.formData || {},
        documents: (entry.documents || []).map(toFileMeta),
        signatureUrl: entry.signatureFileId
          ? `/temp-applications/file/${entry.signatureFileId}`
          : null,
        signatureContentType: entry.signatureContentType || null,
        isPaid: entry.isPaid,
        paymentId: entry.paymentId,
        applicationDate: entry.applicationDate,
        applicationSubmissionDateTime: entry.applicationSubmissionDateTime,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load application', error: err.message })
  }
}

// ── Stream a single stored file back — used when the user CLICKS a
// document/signature thumbnail to view/open it. Nothing is loaded fully
// into memory; it's piped straight from GridFS to the response.
exports.getFile = async (req, res) => {
  try {
    const { fileId } = req.params
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file id.' })
    }
    const _id = new mongoose.Types.ObjectId(fileId)

    const filesColl = mongoose.connection.db.collection('bidderDocuments.files')
    const fileDoc = await filesColl.findOne({ _id })
    if (!fileDoc) {
      return res.status(404).json({ success: false, message: 'File not found.' })
    }

    // Ownership check using the metadata saved at upload time (userId,
    // tenderId, applicationId, label — see uploadBufferToGridFS call in
    // saveApplication). Only the bidder who uploaded it, or staff/reviewer
    // roles, may view it. 'tender_authority' is included here because
    // ApplicantDetails.jsx/ApplicationApplicants.jsx let that role review
    // a bidder's submitted documents — without it, every file request from
    // that review page 403s even though the reviewer is legitimately
    // supposed to see it. Adjust this list if other roles (e.g. the role
    // that approves into bidderlists) also need to view files here.
    const requesterId = String(req.user._id)
    const ownerId = fileDoc.metadata?.userId
    const isOwner = ownerId && ownerId === requesterId
    const isStaff = ['admin', 'department_employee', 'tender_authority'].includes(req.role)

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: 'You do not have access to this file.' })
    }

    // Fall back to application/pdf (not application/octet-stream) — this
    // endpoint only ever serves jpeg/png/pdf, and octet-stream is exactly
    // what makes browsers force a download instead of rendering inline.
    // If you're hitting the download issue, check this in DevTools →
    // Network → this request's response headers: if Content-Type came
    // back as application/octet-stream, fileDoc.contentType was empty,
    // meaning the file was uploaded before contentType was being set
    // correctly and needs to be re-uploaded.
    const contentType = fileDoc.contentType || 'application/pdf'
    res.set('Content-Type', contentType)

    // "inline" lets images render and PDFs open in-browser instead of
    // forcing a download prompt — matches "show the document on click".
    // A bare `inline` with no filename is unreliable in some browsers;
    // always include one.
    const rawName = fileDoc.filename || fileDoc.metadata?.originalName || 'document'
    const safeFilename = String(rawName).replace(/["\\;]/g, '_')
    res.set('Content-Disposition', `inline; filename="${safeFilename}"`)

    // Make sure nothing upstream (proxy/helmet/CDN) sniffs a different
    // type and rewrites this into an attachment.
    res.set('X-Content-Type-Options', 'nosniff')

    const downloadStream = getBucket().openDownloadStream(_id)
    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(404).json({ success: false, message: 'File not found.' })
    })
    downloadStream.pipe(res)
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch file', error: err.message })
  }
}

// ── Finalize the application into `bidderlists` and remove it from the
// temp collection — called the moment the bidder clicks "Next" on
// ApplyTenderForm.jsx. Unlike markPaid, this does NOT require a paymentId;
// it exists so a submitted application immediately disappears from that
// user's Apply Tenders list, independent of any payment step. Reuses the
// exact same fileId references (and the same applicationId) already
// sitting in bidderDocuments.files/.chunks — nothing is re-uploaded.
//
// isDocumentApproved / isBidderApproved: reviewer-facing flags. A brand
// new bidderlists entry always starts both as false (set explicitly below
// so this payload stays self-documenting, even though the schema default
// would do the same thing). On a RE-submission of an entry that already
// exists (existingIndex >= 0 below), these flags are deliberately left
// alone — a bidder editing/resaving and clicking "Next" again must never
// silently wipe out an approval a reviewer already granted.
//
// NOTE: bidderDoc.applications is the ONLY place per-bidder data lives on
// this model (see models/BiddersList.js) — there used to be an older,
// pre-array schema version with applicationId/userId etc. stored directly
// on the top-level document, which is why you may see references to that
// shape in old migration notes. That version is gone; don't reintroduce
// top-level applicationId/userId fields or indexes on this collection —
// doing so previously caused duplicate-key errors (E11000) once more than
// one bidder/tender combination existed, because every document has those
// fields as undefined/null at the top level under the current schema.
exports.submitApplication = async (req, res) => {
  try {
    const { tenderId } = req.params
    const userId = req.user._id

    const tempDoc = await TempBidderApplication.findOne({ tenderId, 'applications.userId': userId })
    if (!tempDoc) {
      return res.status(404).json({ success: false, message: 'Application not found. Please save your application first.' })
    }
    const entry = tempDoc.applications.find((a) => String(a.userId) === String(userId))
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Application not found. Please save your application first.' })
    }

    const now = new Date()
    const bidderEntryPayload = {
      applicationId: entry.applicationId,
      userId,
      formData: entry.formData || {},
      documents: entry.documents || [],
      signatureFileId: entry.signatureFileId || null,
      signatureContentType: entry.signatureContentType || null,
      signatureOriginalName: entry.signatureOriginalName || null,
      isPaid: false,
      paymentId: null,
      applicationDate: entry.applicationDate,
      applicationTime: entry.applicationTime,
      applicationSubmissionDateTime: now,
    }

    let bidderDoc = await BiddersList.findOne({ tenderId })
    if (!bidderDoc) {
      bidderDoc = new BiddersList({
        tenderId,
        departmentId: tempDoc.departmentId,
        applications: [],
        status: 'Submitted',
        applicationDate: entry.applicationDate,
        applicationSubmissionDateTime: now,
      })
    }

    const existingIndex = bidderDoc.applications.findIndex(
      (item) => String(item.userId) === String(userId)
    )

    if (existingIndex >= 0) {
      // Re-submission of an already-existing entry — merge in the fresh
      // form/document data but deliberately leave isDocumentApproved /
      // isBidderApproved untouched (they're not part of bidderEntryPayload,
      // so the spread below preserves whatever was already there).
      bidderDoc.applications[existingIndex] = {
        ...bidderDoc.applications[existingIndex].toObject?.(),
        ...bidderEntryPayload,
      }
    } else {
      // Brand-new submission — explicitly start both reviewer flags false.
      bidderDoc.applications.push({
        ...bidderEntryPayload,
        isDocumentApproved: false,
        isBidderApproved: false,
      })
    }

    bidderDoc.status = 'Submitted'
    bidderDoc.applicationDate = entry.applicationDate || bidderDoc.applicationDate
    bidderDoc.applicationSubmissionDateTime = now
    await bidderDoc.save()

    // Remove this bidder's entry from the temp collection now that it's
    // permanently recorded in bidderlists — the GridFS files are untouched
    // (bidderlists now references the exact same fileIds).
    tempDoc.applications = tempDoc.applications.filter(
      (a) => String(a.userId) !== String(userId)
    )
    if (tempDoc.applications.length === 0) {
      await TempBidderApplication.deleteOne({ _id: tempDoc._id })
    } else {
      await tempDoc.save()
    }

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully.',
      data: { applicationId: bidderEntryPayload.applicationId },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to submit application', error: err.message })
  }
}

// ── Mark an application as paid (optional follow-up step) ─────────────────
// Call this from a payment-success flow (QR paid / mobile-app payment) if
// you wire one up later. Updates the existing bidderlists row created by
// submitApplication() in place — same applicationId, same files, just adds
// payment fields and flips status to 'Paid'. Safe to call any time after
// submission; does NOT touch tempbidderapplications (that entry is already
// gone by the time this runs).
exports.markPaid = async (req, res) => {
  try {
    const { tenderId } = req.params
    const userId = req.user._id
    const { paymentId } = req.body

    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'paymentId is required.' })
    }

    const updated = await BiddersList.findOneAndUpdate(
      { tenderId, userId },
      { status: 'Paid', paymentId, paidAt: new Date() },
      { new: true }
    )

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Submitted application not found for this tender.' })
    }

    return res.status(200).json({ success: true, message: 'Application marked as paid.' })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to mark application paid', error: err.message })
  }
}