// src/middleware/authMiddleware.js
// Reads and verifies the JWT from the Authorization header, loads the
// authenticated user from the database (populating roleId/departmentId),
// and sets req.user / req.role / req.departmentId / req.departmentCode
// from that DB record — never from anything the client sends directly.
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const DEPARTMENT_RESTRICTED_ROLES = [
  'department_employee',
  'department_head',
]

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.header('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' })
    }

    const user = await User.findOne({ _id: payload.userId, isDeleted: false })
      .populate('roleId')
      .populate('departmentId')

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Your account is not active.' })
    }

    const roleName = user.roleId?.name || null

    req.user = user
    req.role = roleName
    req.isDepartmentRestricted = DEPARTMENT_RESTRICTED_ROLES.includes(roleName)
    req.departmentId = user.departmentId ? user.departmentId._id : null
    req.departmentCode = req.isDepartmentRestricted && user.departmentId ? user.departmentId.code : null

    next()
  } catch (err) {
    console.error('authMiddleware error:', err)
    return res.status(500).json({ message: 'Authentication check failed.' })
  }
}

module.exports = authMiddleware