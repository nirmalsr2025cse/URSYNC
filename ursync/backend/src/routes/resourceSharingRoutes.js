// src/routes/resourceSharingRoutes.js
const express = require('express')
const router = express.Router()
const {
  getAvailableResources,
  getUnavailableResources,
  getResourceById,
  updateResource,
  deleteResource,
} = require('../controllers/resourceSharingController')
const authMiddleware = require('../middleware/authMiddleware') // adjust path if named differently in your project

router.use(authMiddleware)

router.get('/available', getAvailableResources)
router.get('/unavailable', getUnavailableResources)
router.get('/:resourceId', getResourceById)
router.patch('/:resourceId', updateResource)
router.delete('/:resourceId', deleteResource)

module.exports = router