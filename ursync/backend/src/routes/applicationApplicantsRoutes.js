// src/routes/applicationApplicantsRoutes.js
const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const {
  getApplicants,
  getApplicantDetails,
  approveApplicant,
  rejectApplicant,
  sendToDepartment,
} = require('../controllers/applicationApplicantsController')

// ── Routes ───────────────────────────────────────────────────────────────
// NOTE route order: 'send-to-department' has no extra path segment after
// it (unlike /:applicationId/approve and /:applicationId/reject), so it
// can't collide with /:applicationId — but it's still registered before
// the /:applicationId route below on general principle (static paths
// before dynamic ones), matching the ordering convention already used in
// tempBidderApplicationRoutes.js.
router.patch('/send-to-department', authMiddleware, sendToDepartment)

// GET /api/tenders/applications/applicants?tenderCode=...&approved=false
router.get('/', authMiddleware, getApplicants)

// GET /api/tenders/applications/applicants/:applicationId
router.get('/:applicationId', authMiddleware, getApplicantDetails)

// PATCH /api/tenders/applications/applicants/:applicationId/approve
router.patch('/:applicationId/approve', authMiddleware, approveApplicant)

// PATCH /api/tenders/applications/applicants/:applicationId/reject
router.patch('/:applicationId/reject', authMiddleware, rejectApplicant)

module.exports = router