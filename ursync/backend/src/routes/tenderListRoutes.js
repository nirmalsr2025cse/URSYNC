// src/routes/tenderListRoutes.js
//
// Mounted at /api/tenders in app.js — and MUST be mounted before
// tenderRoutes, since tenderRoutes has a `GET /:id` route that would
// otherwise swallow `/applications` (treating it as a tender id) before
// it ever reaches this router.

const express = require('express')
const router = express.Router()

const tenderListController = require('../controllers/tenderListController')
const applicationApplicantsController = require('../controllers/applicationApplicantsController')

// ── Applications tab bar (Open / Upcoming / Completed) ─────────────────────
router.get('/applications', tenderListController.getApplicationTenders)
router.get('/applications/counts', tenderListController.getApplicationTenderCounts)
router.get('/applications/meta', tenderListController.getApplicationTenderMeta)

// ── Applicants for a specific tender (isDocumentApproved-driven) ───────────
// NOTE: the literal 'send-to-department' route is registered BEFORE the
// '/:applicationId' param routes so Express doesn't try to match
// "send-to-department" as an :applicationId value.
router.get('/applications/applicants', applicationApplicantsController.getApplicants)
router.patch('/applications/applicants/send-to-department', applicationApplicantsController.sendToDepartment)
router.get('/applications/applicants/:applicationId', applicationApplicantsController.getApplicantDetails)
router.patch('/applications/applicants/:applicationId/approve', applicationApplicantsController.approveApplicant)
router.patch('/applications/applicants/:applicationId/reject', applicationApplicantsController.rejectApplicant)

module.exports = router