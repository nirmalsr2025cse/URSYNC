// src/routes/resourceRoutes.js
const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const { createResource, getDistricts, getMyDepartment } = require('../controllers/resourceController')

// Only department_head may add resources. Add 'administrator' here too
// if admins should also be able to add resources on behalf of departments.
router.use(authMiddleware, requireRole('department_head', 'administrator'))

// GET /api/resources/districts — for the District dropdown.
// GET /api/resources/department — for the read-only Department field
// (returns the logged-in user's own department name, resolved from the
// DB via req.departmentId, instead of the frontend showing a raw
// ObjectId it doesn't have a name for).
router.get('/districts', getDistricts)
router.get('/department', getMyDepartment)

router.post('/', createResource)

module.exports = router