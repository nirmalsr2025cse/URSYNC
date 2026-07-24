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

router.use(authMiddleware)

router.get('/', listTenders) // api/tenders/
router.get('/stats', getStats)// api/tenders/stats
router.get('/categories', getCategories)// api/tenders/categories
router.get('/:tenderCode', getTenderByCode)// api/tenders/:tenderCode

module.exports = router
