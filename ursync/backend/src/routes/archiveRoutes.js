// src/routes/archiveRoutes.js
const express = require('express')
const router = express.Router()
const { searchArchivedTenders } = require('../controllers/archiveController')

// GET /api/tenders/archive?search=&page=&limit=
router.get('/archive', searchArchivedTenders)

module.exports = router