// src/routes/applyTenderRoutes.js
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')

const {
  listApplyTenders,
  getApplyTenderMeta,
  getApplyTenderByCode,
} = require('../controllers/applyTenderController')

router.use(authMiddleware) // all routes below require a logged-in user (req.user)

router.get('/meta', getApplyTenderMeta)        // must come before '/:tenderCode'
router.get('/', listApplyTenders)
router.get('/:tenderCode', getApplyTenderByCode) // ← ADDED: single tender by code, used by ApplyTenderForm.jsx

module.exports = router