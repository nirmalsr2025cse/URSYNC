// src/routes/approvementRoutes.js
const express = require('express')
const router = express.Router()

const {
  getApprovementTenders,
  approveTender,
  rejectTender,
} = require('../controllers/approvementController')

const authMiddleware = require('../middleware/authMiddleware')

router.use(authMiddleware) // all routes below require a logged-in user (req.user)

router.get('/tenders', getApprovementTenders)
router.patch('/tenders/:id/approve', approveTender)
router.patch('/tenders/:id/reject', rejectTender)

module.exports = router