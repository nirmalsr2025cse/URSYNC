// src/middleware/authMiddleware.js
//
// Replaces resolveRole.js. Reads the JWT from the Authorization header,
// verifies it, loads the authenticated user from the DB, and sets
// req.user / req.role / req.departmentId from that DB record — never
// from anything the client claims.

const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.header('Authorization') || ''
    const [scheme, token] = authHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' })
    }

    const user = await User.findById(decoded.sub)
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'This account is not active.' })
    }

    // Always sourced from the DB record, never from the client/token claims
    req.user = user
    req.role = user.role
    req.departmentId = user.departmentId || null

    next()
  } catch (err) {
    console.error('[authMiddleware]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = authMiddleware