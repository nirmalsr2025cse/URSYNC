// src/routes/reportsFeedbacksRoutes.js
const express = require('express')
const router = express.Router()

const {
  getReports,
  getFeedbacks,
  getReportById,
  getFeedbackById,
} = require('../controllers/reportsFeedbacksController')

const authMiddleware = require('../middleware/authMiddleware')

router.use(authMiddleware) // all routes below require a logged-in user (req.user)

router.get('/reports', getReports)
router.get('/reports/:id', getReportById)

router.get('/feedbacks', getFeedbacks)
router.get('/feedbacks/:id', getFeedbackById)

module.exports = router