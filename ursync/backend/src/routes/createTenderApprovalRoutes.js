// src/routes/createTenderApprovalRoutes.js
const express = require('express')
const router = express.Router()

const {
  getFinancialPending,
  getTenderAuthorityPending,
  rejectTender,
  financialApprove,
  tenderAuthorityApprove,
} = require('../controllers/createTenderApprovalController')

const authMiddleware = require('../middleware/authMiddleware')

// Simple inline role gate — authMiddleware already sets req.role from the
// authenticated user's populated roleId.name, so we just compare against it.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.role)) {
      return res.status(403).json({ message: 'You are not authorized to perform this action.' })
    }
    next()
  }
}

// ── Financial ────────────────────────────────────────────────────────────
router.get(
  '/financial/pending',
  authMiddleware,
  requireRole('financial'),
  getFinancialPending
)
router.patch(
  '/financial/:id/approve',
  authMiddleware,
  requireRole('financial'),
  financialApprove
)
router.patch(
  '/financial/:id/reject',
  authMiddleware,
  requireRole('financial'),
  rejectTender
)

// ── Tender Authority ─────────────────────────────────────────────────────
router.get(
  '/tender-authority/pending',
  authMiddleware,
  requireRole('tender_authority'),
  getTenderAuthorityPending
)
router.patch(
  '/tender-authority/:id/approve',
  authMiddleware,
  requireRole('tender_authority'),
  tenderAuthorityApprove
)
router.patch(
  '/tender-authority/:id/reject',
  authMiddleware,
  requireRole('tender_authority'),
  rejectTender
)

module.exports = router