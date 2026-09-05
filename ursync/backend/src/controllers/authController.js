// src/controllers/authController.js
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Role = require('../models/Role')
const Department = require('../models/Department')
const District = require('../models/District')
const generateToken = require('../utils/generateToken')

const GOV_EMAIL_REGEX = /^[^\s@]+@(?:[a-zA-Z0-9-]+\.)*tn\.gov\.in$/i
const PHONE_REGEX = /^[6-9]\d{9}$/ // 10-digit Indian mobile number
const PASSWORD_MIN_LEN = 6
const SALT_ROUNDS = 10

// Strips sensitive/internal fields before sending the user back to the
// client. Never include `passwordHash`. Expects `user.roleId` to already
// be populated (a Role document), so the client gets a readable role name
// instead of a bare ObjectId.
function toSafeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.roleId?.name || null,
    departmentId: user.departmentId,
    district: user.district,
    status: user.status,
  }
}

// POST /api/auth/login
// Body: { email, password }
async function login(req, res) {
  try {
    const { email, password } = req.body

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid request format.' })
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password

    if (!trimmedEmail) return res.status(400).json({ message: 'Email is required.' })
    if (!trimmedPassword) return res.status(400).json({ message: 'Password is required.' })

    // .select('+passwordHash') required — schema marks it select:false
    const user = await User.findOne({ email: trimmedEmail, isDeleted: false })
      .select('+passwordHash')
      .populate('roleId')

    if (!user) {
      // Same generic message as "wrong password" below — never reveal
      // whether the email exists.
      return res.status(401).json({ message: 'Invalid credentials.' })
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Your account is not active. Contact your administrator.' })
    }

    const passwordMatches = await bcrypt.compare(trimmedPassword, user.passwordHash)
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials.' })
    }

    const token = generateToken(user)

    return res.status(200).json({
      token,
      user: toSafeUser(user),
    })
  } catch (err) {
    console.error('login error:', err)
    return res.status(500).json({ message: 'Something went wrong. Please try again.' })
  }
}

// POST /api/auth/signup
// Body: { name, department, email, password, phone }
//
// UPDATED BEHAVIOR: self-registered accounts are now created directly as
// "Active" and a token is issued immediately, so the frontend can log the
// user straight into the Home/Dashboard without a separate admin-approval
// step. Role is still always the low-privilege "department_employee" —
// only the *status* changed, never the role. If you later want approval
// gating back, flip `status` below to 'PendingVerification' and stop
// returning a token.
async function signup(req, res) {
  try {
    const { name, department, district, email, password, phone } = req.body

    if (
      typeof name !== 'string' ||
      typeof department !== 'string' ||
      typeof district !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof phone !== 'string'
    ) {
      return res.status(400).json({ message: 'Invalid request format.' })
    }

    const trimmedName = name.trim()
    const trimmedDepartment = department.trim()
    const trimmedDistrict = district.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password
    const trimmedPhone = phone.trim()

    // ── Presence validation ────────────────────────────────────────────
    if (!trimmedName) return res.status(400).json({ message: 'Full name is required.' })
    if (!trimmedDepartment) return res.status(400).json({ message: 'Department is required.' })
    if (!trimmedDistrict) return res.status(400).json({ message: 'District is required.' })
    if (!trimmedEmail) return res.status(400).json({ message: 'Email is required.' })
    if (!trimmedPassword) return res.status(400).json({ message: 'Password is required.' })
    if (!trimmedPhone) return res.status(400).json({ message: 'Mobile number is required.' })

    // ── Format validation ───────────────────────────────────────────────
    if (!GOV_EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Enter a valid @tn.gov.in email address.' })
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' })
    }
    if (trimmedPassword.length < PASSWORD_MIN_LEN) {
      return res.status(400).json({ message: `Password must be at least ${PASSWORD_MIN_LEN} characters.` })
    }

    // ── Department allow-list check ─────────────────────────────────────
    // The frontend sends a department NAME string from a <select> — never
    // trust it directly. Resolve it against the real departments
    // collection; reject anything that doesn't match a known department.
    const departmentDoc = await Department.findOne({ name: trimmedDepartment, isActive: true })
    if (!departmentDoc) {
      return res.status(400).json({ message: 'Select a valid department.' })
    }

    // ── District allow-list check ────────────────────────────────────────
    // Same reasoning as department: the frontend sends a district NAME
    // string from a <select> — resolve it against the real districts
    // collection rather than trusting it directly.
    const districtDoc = await District.findOne({ name: trimmedDistrict, isActive: true })
    if (!districtDoc) {
      return res.status(400).json({ message: 'Select a valid district.' })
    }

    // ── Role lookup ──────────────────────────────────────────────────────
    const employeeRole = await Role.findOne({ name: 'department_employee', isActive: true })
    if (!employeeRole) {
      // Roles collection isn't seeded yet — this is a setup problem, not
      // a user input problem. Run seed.js.
      return res.status(500).json({ message: 'Signup is not available right now. Please contact support.' })
    }

    // ── Uniqueness check ─────────────────────────────────────────────────
    const existingUser = await User.findOne({ email: trimmedEmail })
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    // ── Create user ──────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(trimmedPassword, SALT_ROUNDS)

    const user = await User.create({
      fullName: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      passwordHash,
      roleId: employeeRole._id,
      departmentId: departmentDoc._id,
      district: districtDoc._id,
      status: 'Active',       // <-- immediately active, no admin approval step
      emailVerified: false,
      isDeleted: false,
    })

    const populatedUser = await user.populate('roleId')

    const token = generateToken(populatedUser)

    // Token is issued now so the frontend can log the user straight into
    // the Home/Dashboard right after signup.
    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: toSafeUser(populatedUser),
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    console.error('signup error:', err)
    return res.status(500).json({ message: 'Something went wrong. Please try again.' })
  }
}

// GET /api/auth/me
// Returns current authenticated user and populated role directly from DB
async function getMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' })
    }
    return res.status(200).json({
      success: true,
      user: toSafeUser(req.user),
      role: req.role,
    })
  } catch (err) {
    console.error('getMe error:', err)
    return res.status(500).json({ message: 'Failed to fetch user profile.' })
  }
}

module.exports = { login, signup, getMe }