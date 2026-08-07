// src/routes/appliedTenderRoutes.js
//
// Mount in server.js / app.js alongside the existing apply-tenders /
// temp-applications routers, e.g.:
//
//   const appliedTenderRoutes = require('./routes/appliedTenderRoutes')
//   app.use('/api/applied-tenders', appliedTenderRoutes)
//
// (The file-stream route is also exposed WITHOUT the /api prefix at
// /applied-tenders/file/:fileId to match how ApplyTenderForm.jsx's
// ImageUploadBox builds existingUrl -> `${API_BASE}${existingUrl}`, i.e.
// it expects existingUrl itself to already start with /applied-tenders/...
// and API_BASE = http://localhost:5000/api. If your API_BASE does NOT
// include /api, drop the '/api' prefix below and mount everything under
// plain '/applied-tenders' instead — see inline note.)

const express = require('express')
const multer = require('multer')
const authMiddleware = require('../middleware/authMiddleware') // existing project auth middleware
const ctrl = require('../controllers/appliedTenderController')

const router = express.Router()

// In-memory storage — files are streamed straight into GridFS in the
// controller, never written to local disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches ImageUploadBox's client-side check
})

// List current user's applied / completed tenders for the AppliedTenders.jsx grid.
// GET /api/applied-tenders?tab=applied|completed
router.get('/', authMiddleware, ctrl.listAppliedTenders)

// Fetch one application (pre-fill for the Edit form).
// GET /api/applied-tenders/:applicationId
router.get('/:applicationId', authMiddleware, ctrl.getAppliedTenderForEdit)

// Save edits (multipart/form-data: formData + optional document/signature files).
// PUT /api/applied-tenders/:applicationId
router.put('/:applicationId', authMiddleware, upload.any(), ctrl.updateAppliedTender)

// Authenticated file stream for an uploaded document/signature.
// GET /api/applied-tenders/file/:fileId
router.get('/file/:fileId', authMiddleware, ctrl.streamAppliedTenderFile)

module.exports = router