// src/routes/tenderRoutes.js
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const {
  listTenders,
  getStats,
  getCategories,
  getTenderByCode,
} = require('../controllers/tenderController')
const organizationRoutes = require('./organizationRoutes')
const classificationRoutes = require('./classificationRoutes')
const archiveRoutes = require('./archiveRoutes')

router.use(authMiddleware)

router.get('/', listTenders) // api/tenders/
router.get('/stats', getStats) // api/tenders/stats
router.get('/categories', getCategories) // api/tenders/categories

// Tenders-by-Organisation page (TenderByOrganization.jsx)
// Mounted BEFORE the /:tenderCode catch-all so "/by-organization" and
// "/by-organization/meta" aren't misread as a tenderCode lookup.
router.use('/', organizationRoutes)
router.use('/', classificationRoutes)
router.use('/', archiveRoutes)

router.get('/:tenderCode', getTenderByCode) // api/tenders/:tenderCode

module.exports = router