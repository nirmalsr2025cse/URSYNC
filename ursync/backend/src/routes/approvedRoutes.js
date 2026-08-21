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
} = require('../controllers/approvedController')

router.get('/tabs', authMiddleware, getApprovedTabs)
router.get('/tenders/approved', authMiddleware, getApprovedTenders)
router.get('/bidders/approved', authMiddleware, getApprovedBidders)

module.exports = router

// ── Mount in your main app/router file, e.g.: ──────────────────────────────
//   const approvedRoutes = require('./routes/approvedRoutes')
//   app.use('/api/approvement', approvedRoutes)