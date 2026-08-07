// src/routes/tempBidderApplicationRoutes.js
const express = require('express')
const multer = require('multer')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const {
  saveApplication,
  getApplication,
  getFile,
  markPaid,
  submitApplication,
} = require('../controllers/tempBidderApplicationController')

// ── In-memory storage ────────────────────────────────────────────────────
// Files are held in RAM as a Buffer only for the duration of the request —
// nothing touches disk. They only get persisted to MongoDB (via GridFS)
// inside saveApplication, i.e. only when the user clicks Save/Next. If the
// request is abandoned client-side before that, nothing is ever written.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or PDF files are allowed.'))
    }
    cb(null, true)
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file (PDFs run larger than JPEGs)
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
// NOTE route order matters: /file/:fileId must be registered BEFORE
// /:tenderId, otherwise Express matches "file" as a :tenderId param and the
// wrong handler (getApplication → Tender.findById('file')) runs instead.
router.get('/file/:fileId', authMiddleware, getFile)

router.get('/:tenderId', authMiddleware, getApplication)

router.post(
  '/:tenderId',
  authMiddleware,
  upload.fields(DOCUMENT_FIELDS),
  saveApplication
)

// Called when the bidder clicks "Next" on ApplyTenderForm.jsx — finalizes
// the current draft into `bidderlists` (reusing the same GridFS files) and
// removes it from tempbidderapplications, so the tender then disappears
// from that user's Apply Tenders list.
router.post('/:tenderId/submit', authMiddleware, submitApplication)

// Optional follow-up step if/when a payment flow is wired up — updates the
// existing bidderlists row created by /submit rather than creating a new one.
router.patch('/:tenderId/mark-paid', authMiddleware, markPaid)

module.exports = router