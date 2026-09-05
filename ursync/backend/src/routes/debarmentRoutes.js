// src/routes/debarmentRoutes.js
const express = require('express')
const router = express.Router()
const {
  getOrganisationDebarments,
  getIndividualDebarments,
  getDebarmentCounts,
  searchDebarments,
} = require('../controllers/debarmentController')

// GET /api/debarments/organisation?page=&limit=
router.get('/organisation', getOrganisationDebarments)

// GET /api/debarments/individual?page=&limit=
router.get('/individual', getIndividualDebarments)

// GET /api/debarments/counts -> { individual, organization }
router.get('/counts', getDebarmentCounts)

// GET /api/debarments/search?dateCriteria=&fromDate=&toDate=&searchId=&organisation=&productCategory=&page=&limit=
router.get('/search', searchDebarments)

module.exports = router