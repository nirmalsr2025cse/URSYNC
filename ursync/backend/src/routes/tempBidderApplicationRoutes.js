// src/routes/tempBidderApplicationRoutes.js
const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const {
  saveApplication,
  getApplication,
  markPaid,
} = require('../controllers/tempBidderApplicationController')

// ── Temp disk storage ────────────────────────────────────────────────────
// Files live under uploads/temp/<tenderId>/<userId>/ so cleanup + URL
// resolution can group by user without a DB lookup. This is TEMP storage
// only — never treat it as permanent (see cleanupTempApplications.js).
const TEMP_ROOT = path.join(__dirname, '..', '..', 'uploads', 'temp')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(TEMP_ROOT, String(req.params.tenderId), String(req.user._id))
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    // fieldname is the document label (or "signature"); overwrite on re-save.
    const safeField = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '_')
    cb(null, `${safeField}.jpg`)
  },
})

function fileFilter(req, file, cb) {
  if (file.mimetype !== 'image/jpeg') {
    return cb(new Error('Only JPEG images are allowed.'))
  }
  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
})

const DOCUMENT_FIELDS = [
  'PAN Card Upload',
  'GST Certificate Upload',
  'Registration Certificate',
  'Experience Certificate',
  'Financial Statement',
  'Technical Proposal',
  'Commercial Proposal',
  'Additional Documents',
  'signature',
].map((name) => ({ name, maxCount: 1 }))

// ── Routes ───────────────────────────────────────────────────────────────
router.get('/:tenderId', authMiddleware, getApplication)

router.post(
  '/:tenderId',
  authMiddleware,
  upload.fields(DOCUMENT_FIELDS),
  saveApplication
)

router.patch('/:tenderId/mark-paid', authMiddleware, markPaid)

module.exports = router