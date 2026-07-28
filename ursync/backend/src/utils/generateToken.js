// src/utils/generateToken.js
const jwt = require('jsonwebtoken')

// Signs a JWT containing only the minimal claims the rest of the backend
// needs (userId, role). Department/status are re-derived from the DB on
// every request in authMiddleware — never baked into the token — so a
// department reassignment or deactivation takes effect immediately
// without requiring the user to log in again.
function generateToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.roleId?.name || null }, // was user.role, which doesn't exist on the schema
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  )
}

module.exports = generateToken