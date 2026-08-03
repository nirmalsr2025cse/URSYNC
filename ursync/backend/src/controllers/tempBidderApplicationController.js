// src/controllers/tempBidderApplicationController.js
const fs = require('fs')
const path = require('path')
const TempBidderApplication = require('../models/TempBidderApplication')
const Tender = require('../models/Tender')

// ── Save (create-or-update) the current user's in-progress application ────
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

    // req.files is an object keyed by fieldname when using multer.fields()
    const files = req.files || {}
    const newDocuments = []
    let newSignaturePath = null

    Object.keys(files).forEach((fieldName) => {
      const fileArr = files[fieldName]
      if (!fileArr || !fileArr[0]) return
      const uploaded = fileArr[0]
      if (fieldName === 'signature') {
        newSignaturePath = uploaded.path
      } else {
        newDocuments.push({
          label: fieldName,
          filePath: uploaded.path,
          originalName: uploaded.originalname,
        })
      }
    })

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

    const now = new Date()
    const applicationDate = now.toISOString().slice(0, 10)

    if (existingEntry) {
      // Merge form data (keep previously saved fields not present this time)
      existingEntry.formData = { ...existingEntry.formData, ...formData }

      // Replace any document whose label was re-uploaded this time, deleting
      // the old file from disk first; keep the rest untouched.
      newDocuments.forEach((doc) => {
        const idx = existingEntry.documents.findIndex((d) => d.label === doc.label)
        if (idx >= 0) {
          deleteFileSafe(existingEntry.documents[idx].filePath)
          existingEntry.documents[idx] = doc
        } else {
          existingEntry.documents.push(doc)
        }
      })

      if (newSignaturePath) {
        deleteFileSafe(existingEntry.signatureFilePath)
        existingEntry.signatureFilePath = newSignaturePath
      }

      existingEntry.applicationTime = now
      existingEntry.applicationDate = applicationDate
    } else {
      tempDoc.applications.push({
        userId,
        formData,
        documents: newDocuments,
        signatureFilePath: newSignaturePath,
        isPaid: false,
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

    // Convert absolute disk paths to URLs the frontend can preview/download.
    const toUrl = (p) => (p ? '/temp-uploads/' + path.basename(path.dirname(p)) + '/' + path.basename(p) : null)

    return res.status(200).json({
      success: true,
      data: {
        formData: entry.formData || {},
        documents: (entry.documents || []).map((d) => ({ label: d.label, url: toUrl(d.filePath), originalName: d.originalName })),
        signatureUrl: toUrl(entry.signatureFilePath),
        isPaid: entry.isPaid,
        applicationDate: entry.applicationDate,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load application', error: err.message })
  }
}

// ── Mark an application as paid (call this from your payment-success flow) ─
// NOTE: this only flips the flag so the cleanup job skips it. Wire your
// actual "copy into permanent applications collection" step wherever your
// payment webhook/confirmation handler lives, then optionally remove this
// temp entry once the permanent record is safely created.
exports.markPaid = async (req, res) => {
  try {
    const { tenderId } = req.params
    const userId = req.user._id

    const tempDoc = await TempBidderApplication.findOne({ tenderId, 'applications.userId': userId })
    if (!tempDoc) {
      return res.status(404).json({ success: false, message: 'Application not found.' })
    }
    const entry = tempDoc.applications.find((a) => String(a.userId) === String(userId))
    entry.isPaid = true
    await tempDoc.save()

    return res.status(200).json({ success: true, message: 'Application marked as paid.' })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to mark application paid', error: err.message })
  }
}

function deleteFileSafe(filePath) {
  if (!filePath) return
  fs.unlink(filePath, () => {}) // ignore errors (file may already be gone)
}