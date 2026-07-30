// src/routes/classificationRoutes.js
const express = require('express')
const router = express.Router()
const {
  searchTendersByClassification,
  getClassificationFilterMeta,
} = require('../controllers/classificationController')

// GET /api/tenders/by-classification?keyword=&classification=&category=&productCategory=&organizationType=&district=&status=&minValue=&maxValue=&sortBy=&page=&limit=
router.get('/by-classification', searchTendersByClassification)

// GET /api/tenders/by-classification/meta → dropdown options
router.get('/by-classification/meta', getClassificationFilterMeta)

module.exports = router