// src/routes/applicationApplicantsRoutes.js
//
// Exposes applicationApplicantsController's endpoints, matching exactly
// what Applications.jsx / ApplicationApplicants.jsx / ApprovedApplicants.jsx
// / ApplicantDetails.jsx already call via apiFetch (base path /api on the
// frontend, so these routes must be mounted at /api/tenders/applications/applicants
// — see the one-line mounting note below).
//
// TODO: replace with your project's real auth middleware import/name if it
// differs from this.

const express = require('express')
const router = express.Router()

const {
  getApplicants,
  getApplicantDetails,
  approveApplicant,
  rejectApplicant,
} = require('../controllers/applicationApplicantsController')

const authMiddleware = require('../middleware/authMiddleware') // adjust path/name if needed

// GET /api/tenders/applications/applicants?tenderCode=...&approved=false|true|all
router.get('/', authMiddleware, getApplicants)

// GET /api/tenders/applications/applicants/:applicationId
router.get('/:applicationId', authMiddleware, getApplicantDetails)

// PATCH /api/tenders/applications/applicants/:applicationId/approve
router.patch('/:applicationId/approve', authMiddleware, approveApplicant)

// PATCH /api/tenders/applications/applicants/:applicationId/reject
router.patch('/:applicationId/reject', authMiddleware, rejectApplicant)

module.exports = router