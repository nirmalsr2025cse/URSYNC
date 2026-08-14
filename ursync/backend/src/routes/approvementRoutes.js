// src/routes/approvementRoutes.js
const express = require('express')
const router = express.Router()

const {
  getApprovementTenders,
  approveTender,
  rejectTender,
  getBidderFinalizationTenders,
} = require('../controllers/approvementController')

const authMiddleware = require('../middleware/authMiddleware')

router.use(authMiddleware) // all routes below require a logged-in user (req.user)

// ── Tenders tab (CreateTender model — Sent to Head / Sent to Administrator) ─
router.get('/tenders', getApprovementTenders)
router.patch('/tenders/:id/approve', approveTender)
router.patch('/tenders/:id/reject', rejectTender)

// ── Bidders tab (Tender model — ready for bidder finalization) ─────────────
router.get('/bidders', getBidderFinalizationTenders)

module.exports = router