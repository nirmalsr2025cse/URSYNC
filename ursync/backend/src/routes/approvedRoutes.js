// src/routes/approvedRoutes.js
const express = require('express')
const router = express.Router()
// authMiddleware.js exports the function directly (module.exports = authMiddleware),
// so it's imported without destructuring.
const authMiddleware = require('../middleware/authMiddleware')
const {
  getApprovedTabs,
  getApprovedTenders,
  getApprovedBidders,
  getApprovedBidderApplicants,
} = require('../controllers/approvedController')
router.get('/tabs', authMiddleware, getApprovedTabs)
router.get('/tenders/approved', authMiddleware, getApprovedTenders)
router.get('/bidders/approved', authMiddleware, getApprovedBidders)
// Read-only applicant list for a single tender's Bidders-tab card
// (tender_authority -> bidderlists, department_head/employee -> finalbidders).
// :tenderId here is the tenderCode, e.g. "TN/PWD/2026/001".
router.get('/bidders/:tenderId/applicants', authMiddleware, getApprovedBidderApplicants)
module.exports = router
// ── Mount in your main app/router file, e.g.: ──────────────────────────────
//   const approvedRoutes = require('./routes/approvedRoutes')
//   app.use('/api/approvement', approvedRoutes)