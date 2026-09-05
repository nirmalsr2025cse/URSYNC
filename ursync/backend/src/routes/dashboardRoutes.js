// src/routes/dashboardRoutes.js
const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')

// GET /api/dashboard/overview-stats
router.get('/overview-stats', dashboardController.getOverviewStats)

// GET /api/dashboard/number-wise
router.get('/number-wise', dashboardController.getNumberWiseAnalysis)

module.exports = router
