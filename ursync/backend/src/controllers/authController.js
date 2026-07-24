// src/controllers/authController.js
const bcrypt = require('bcrypt')
const User = require('../models/User')
const generateToken = require('../utils/generateToken')

// POST /api/auth/login
async function login(req, res) {
  try {
    const { identifier, password } = req.body

    // ── Basic presence validation ──────────────────────────────────────
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ message: 'Email is required.' })
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Password is required.' })
    }

    const email = identifier.trim().toLowerCase()

    // password hash is select:false on the schema, so it must be pulled
    // in explicitly here
    const user = await User.findOne({ email }).select('+password')

    // Same generic message for "no such user" and "wrong password" so we
    // don't leak which part was wrong (avoids user enumeration)
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'This account is not active. Contact your administrator.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = generateToken(user)

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
      },
    })
  } catch (err) {
    console.error('[authController.login]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { login }