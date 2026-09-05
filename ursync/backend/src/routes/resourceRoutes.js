const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const {
  listResources,
  listSharingResources,
  listResourceRequests,
  decideResourceRequest,
  updateApprovedRequestDate,
  getResourceById,
  getResourceAvailability,
  createResource,
  updateResource,
  deleteResource,
  applyForResource,
  getMyRequests,
  decideApplication,
  getMyDepartment,
  listDistricts,
} = require('../controllers/resourceController')

const router = express.Router()

router.use(authMiddleware)

router.get('/resource-sharing/resources', requireRole('department_head', 'administrator'), listSharingResources)
router.get('/resource-sharing/requests', requireRole('department_head', 'administrator'), listResourceRequests)
router.patch('/resource-sharing/requests/:requestId', requireRole('department_head', 'administrator'), decideResourceRequest)
router.patch('/resource-sharing/requests/:requestId/date', requireRole('department_head', 'administrator'), updateApprovedRequestDate)

router.get('/resources', listResources)
router.get('/resources/department', getMyDepartment)
router.get('/resources/districts', listDistricts)
router.get('/resources/:id/availability', getResourceAvailability)
router.get('/resources/:id', getResourceById)

router.post(
  '/resources',
  requireRole('department_employee', 'department_head', 'administrator'),
  createResource
)
router.patch(
  '/resources/:id',
  requireRole('department_employee', 'department_head', 'administrator'),
  updateResource
)
router.put(
  '/resources/:id',
  requireRole('department_employee', 'department_head', 'administrator'),
  updateResource
)
router.delete(
  '/resources/:id',
  requireRole('department_employee', 'department_head', 'administrator'),
  deleteResource
)
router.delete(
  '/resource-sharing/resources/:id',
  requireRole('department_employee', 'department_head', 'administrator'),
  deleteResource
)
router.post('/resources/:id/apply', applyForResource)
router.get('/resource-requests/mine', getMyRequests)
router.patch(
  '/resources/:id/applications/:appId',
  requireRole('department_head', 'administrator'),
  decideApplication
)

module.exports = router
