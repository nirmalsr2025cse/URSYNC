// src/utils/generateToken.js
const jwt = require('jsonwebtoken')

function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      departmentId: user.departmentId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  )
}

module.exports = generateToken