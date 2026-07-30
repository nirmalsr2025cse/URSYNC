// src/routes/organizationRoutes.js
const express = require('express')
const router = express.Router()
const {
  searchTendersByOrganization,
  getStatusCounts,
  getOrganizationFilterMeta,
} = require('../controllers/organizationController')

// GET /api/tenders/by-organization?organization=&organizationType=&tenderCategory=&district=&expiry=&page=&limit=
router.get('/by-organization', searchTendersByOrganization)

// GET /api/tenders/by-organization/status-counts?organization=&organizationType=&tenderCategory=&district=
router.get('/by-organization/status-counts', getStatusCounts)

// GET /api/tenders/by-organization/meta  → dropdown options for the filters above
router.get('/by-organization/meta', getOrganizationFilterMeta)

module.exports = router