// src/routes/dashboardRoutes.js
const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')

// GET /api/dashboard/overview-stats
router.get('/overview-stats', dashboardController.getOverviewStats)

// GET /api/dashboard/number-wise
router.get('/number-wise', dashboardController.getNumberWiseAnalysis)

// GET /api/dashboard/value-wise
router.get('/value-wise', dashboardController.getValueWiseAnalysis)

// GET /api/dashboard/number-value-wise
router.get('/number-value-wise', dashboardController.getNumberValueWiseAnalysis)

// GET /api/dashboard/percentage-wise
router.get('/percentage-wise', dashboardController.getPercentageWiseAnalysis)

// GET /api/dashboard/bids-awarded
router.get('/bids-awarded', dashboardController.getBidsAwardedAnalysis)

// GET /api/dashboard/bidder-wise
router.get('/bidder-wise', dashboardController.getBidderWiseAnalysis)

// GET /api/dashboard/bid-analysis
router.get('/bid-analysis', dashboardController.getBidAnalysis)

// GET /api/dashboard/top10-analysis
router.get('/top10-analysis', dashboardController.getTop10Analysis)

// GET /api/dashboard/last-12-months-trend
router.get('/last-12-months-trend', dashboardController.getLast12MonthsTrend)

// GET /api/dashboard/year-over-year
router.get('/year-over-year', dashboardController.getYearOverYearAnalysis)

module.exports = router
