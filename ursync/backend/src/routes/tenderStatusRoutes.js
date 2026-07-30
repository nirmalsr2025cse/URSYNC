// src/routes/tenderStatusRoutes.js
const express = require('express')
const router = express.Router()
const {
  searchTendersByStatus,
  getStatusMeta,
} = require('../controllers/tenderStatusController')

// GET /api/tenders/status/meta
router.get('/status/meta', getStatusMeta)

// GET /api/tenders/status?tenderStatus=&fromDate=&toDate=&...&page=&limit=
router.get('/status', searchTendersByStatus)

module.exports = router