// src/routes/financialChangeRoutes.js
const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const {
  getApplyTenders,
  getAppliedTenders,
  applyFinancialChange,
} = require('../controllers/financialChangeController')

// Only department_head may view/act on these. Add 'administrator' here
// too if admins should also be able to see/edit every department.
const ALLOWED_ROLES = ['department_head', 'administrator']

router.use(authMiddleware, requireRole(...ALLOWED_ROLES))

router.get('/apply', getApplyTenders)
router.get('/applied', getAppliedTenders)
router.patch('/:tenderId', applyFinancialChange)

module.exports = router