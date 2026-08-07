// src/routes/paymentRoutes.js
const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const {
  getApplicationSummary,
  createQr,
  checkQrStatus,
  handleWebhook,
} = require('../controllers/paymentController')

// GET /api/payments/application/:tenderId
// Validates the page is legitimately reachable (draft exists, not yet paid).
router.get('/application/:tenderId', authMiddleware, getApplicationSummary)

// POST /api/payments/qr/:tenderId  → create (or reuse) a fixed-amount UPI QR
router.post('/qr/:tenderId', authMiddleware, createQr)

// GET /api/payments/qr/:tenderId/status  → polled by the frontend
router.get('/qr/:tenderId/status', authMiddleware, checkQrStatus)

// POST /api/payments/webhook  → Razorpay server-to-server callback.
// NOTE: mounted with express.raw() in app.js, NOT express.json(), so the
// signature can be verified against the exact raw bytes Razorpay sent.
router.post('/webhook', handleWebhook)

module.exports = router