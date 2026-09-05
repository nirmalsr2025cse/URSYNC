// src/middleware/requireRole.js
//
// Generic role gate. Usage: requireRole('department_head')
// or requireRole('department_head', 'administrator') to allow several roles.
// Must run AFTER authMiddleware (needs req.role to already be set).
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.role) {
      return res.status(401).json({ message: 'Authentication required.' })
    }
    if (!allowedRoles.includes(req.role)) {
      return res.status(404).json({ success: false, message: 'Resource not found' })
    }
    next()
  }
}

module.exports = requireRole