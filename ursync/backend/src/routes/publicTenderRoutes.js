// src/routes/publicTender.routes.js
const express = require('express')
const router = express.Router()

const {
  getAllPublishedTenders,
  getPublishedTenderById,
} = require('../controllers/publicTenderController')

// NOTE: intentionally NOT wrapped with `protect` / role middleware — this
// list is meant to be visible to any logged-in user regardless of role
// (department_employee, department_head, financial, tender_authority,
// administrator, etc.). If you want it to require at least being logged
// in (but still no specific role check), add `router.use(protect)` here.

router.get('/', getAllPublishedTenders)
router.get('/:id', getPublishedTenderById)

module.exports = router