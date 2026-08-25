// src/routes/financialChangeRoutes.js
const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const {
  getFinancialChangeTenders,
  applyFinancialChange,
  getAllFinancialChangeRequests,
  setFinancialChangeStatus,
  editFinancialChangeAmount,
} = require('../controllers/financialChangeController')

// Final role split:
//   department_head  -> reviews / approves / rejects / edits financial
//                        change requests for tenders in their OWN
//                        department (TenderFinancialReviewPage.jsx)
//   (financialChangeRoutes below is for a separate Apply page, not covered
//   by this delivery — leave its role gate as-is until that page is
//   finalized)
//
// authMiddleware sets req.role (and req.departmentId) from the DB-loaded
// user but doesn't gate on role itself, so a small role-check middleware
// sits in front of it here.
function requireRole(roleName) {
  return (req, res, next) => {
    if (req.role !== roleName) {
      return res.status(403).json({ message: `Only ${roleName} can access this resource.` })
    }
    next()
  }
}

// ── department_head: Apply / Applied tabs ──────────────────────────────────
// Mount: app.use('/api/financial-changes', financialChangeRoutes)
const financialChangeRoutes = express.Router()
financialChangeRoutes.get('/tenders', authMiddleware, requireRole('department_head'), getFinancialChangeTenders)
financialChangeRoutes.post('/apply', authMiddleware, requireRole('department_head'), applyFinancialChange)

// ── department_head: review page (own department only) ─────────────────────
// Mount: app.use('/api/review-financial-changes', reviewFinancialChangeRoutes)
const reviewFinancialChangeRoutes = express.Router()
reviewFinancialChangeRoutes.get('/requests', authMiddleware, requireRole('department_head'), getAllFinancialChangeRequests)
reviewFinancialChangeRoutes.patch('/:tenderCode/changes/:changeId/status', authMiddleware, requireRole('department_head'), setFinancialChangeStatus)
reviewFinancialChangeRoutes.patch('/:tenderCode/changes/:changeId', authMiddleware, requireRole('department_head'), editFinancialChangeAmount)

module.exports = { financialChangeRoutes, reviewFinancialChangeRoutes }