// src/routes/authRoutes.js
const express = require('express')
const router = express.Router()
const { login, signup, getMe } = require('../controllers/authController')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/login', login)
router.post('/signup', signup)
router.get('/me', authMiddleware, getMe)

module.exports = router