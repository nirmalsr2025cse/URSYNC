// src/routes/searchResourceRoutes.js
//
// Public read-only routes for browsing/searching available Resources.
// No authMiddleware here on purpose — search-resource is a public-facing
// listing page (like ResourceSharing), not an authenticated dashboard
// action. If that changes, add authMiddleware the same way other route
// files in this project do.
const express = require('express')
const router = express.Router()
const {
  searchResources,
  getResourceById,
} = require('../controllers/searchResourcesController')

// GET /api/search-resources?q=jcb
router.get('/', searchResources)

// GET /api/search-resources/:id
router.get('/:id', getResourceById)

module.exports = router