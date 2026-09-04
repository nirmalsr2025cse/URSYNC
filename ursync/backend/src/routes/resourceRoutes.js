const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const {
  listResources,
  getResourceById,
  createResource,
  applyForResource,
  getMyRequests,
  decideApplication,
  getMyDepartment,
  listDistricts,
} = require('../controllers/resourceController')

const router = express.Router()

router.use(authMiddleware)

router.get('/resources', listResources)
router.get('/resources/department', getMyDepartment)
router.get('/resources/districts', listDistricts)
router.get('/resources/:id', getResourceById)

router.post(
  '/resources',
  requireRole('department_employee', 'department_head', 'administrator'),
  createResource
)
router.post('/resources/:id/apply', applyForResource)
router.get('/resource-requests/mine', getMyRequests)
router.patch(
  '/resources/:id/applications/:appId',
  requireRole('department_head', 'administrator'),
  decideApplication
)

module.exports = router
