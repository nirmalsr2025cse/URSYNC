// src/routes/financialChangingRoutes.js
const express = require('express')
const router = express.Router()
const {
  getFinancialChangeRequests,
  approveFinancialChange,
  rejectFinancialChange,
} = require('../controllers/financialChangingController')

// Swap in whatever auth/role middleware the rest of your routes use
// (e.g. requireAuth, requireRole('financial')) — left out here since it
// wasn't part of what you shared.
router.get('/', getFinancialChangeRequests)
router.patch('/:tenderCode/approve', approveFinancialChange)
router.patch('/:tenderCode/reject', rejectFinancialChange)

module.exports = router