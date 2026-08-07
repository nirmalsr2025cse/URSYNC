// src/services/razorpayService.js
//
// Thin wrapper around the Razorpay Node SDK. Requires:
//   npm install razorpay
// and these env vars set (get them from the Razorpay Dashboard → API Keys):
//   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
//   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
//   RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxx   (set when you configure the webhook in the Dashboard)
//
// ── TEST / MOCK MODE ─────────────────────────────────────────────────────
// If your Razorpay account doesn't have UPI enabled yet (common until KYC
// is done), set this in your .env to bypass Razorpay entirely and fake the
// whole QR + payment lifecycle so you can keep developing/testing:
//
//   RAZORPAY_MOCK_MODE=true
//
// With this on:
//   - createFixedAmountQr()   -> returns a fake QR id + a placeholder QR image, no network call
//   - fetchQr()               -> returns that fake QR as "active" (or "closed" after close_by)
//   - fetchQrPayments()       -> returns an empty array for the first
//                                MOCK_PAY_AFTER_MS, then a fake "captured"
//                                payment for the right amount — so your
//                                frontend polling loop gets to actually
//                                exercise the "payment received" path too.
//   - closeQr()               -> just marks the mock QR closed, no network call
//   - verifyWebhookSignature()-> always returns true (webhooks aren't used
//                                by the mock — status is discovered via
//                                polling fetchQrPayments instead)
//
// IMPORTANT: never leave RAZORPAY_MOCK_MODE=true in production. Nothing
// here talks to Razorpay or moves real money while it's on.

const Razorpay = require('razorpay')
const crypto = require('crypto')

const MOCK_MODE = String(process.env.RAZORPAY_MOCK_MODE).toLowerCase() === 'true'

if (!MOCK_MODE && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
  console.warn('[razorpayService] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set — payment routes will fail.')
}

if (MOCK_MODE) {
  console.warn('[razorpayService] RAZORPAY_MOCK_MODE=true — using FAKE QR/payment data. No real Razorpay calls will be made.')
}

const razorpay = MOCK_MODE
  ? null
  : new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

// ── UPI QR Code (single-use, fixed amount) ─────────────────────────────────
// Docs: https://razorpay.com/docs/payments/qr-codes/
//
// `close_by` is set to now + QR_TTL_MINUTES so a stale/abandoned QR can't be
// paid hours later (handles "QR expires while payment app is open" and
// "payment after expiry" — Razorpay itself rejects payment attempts against
// a closed QR, we just also surface that state cleanly to the frontend).
const QR_TTL_MINUTES = 15

// How long (ms) a mock QR stays "pending" before fetchQrPayments() starts
// reporting a captured payment. Lets you see the QR/pending UI for a bit
// before it auto-completes. Set to 0 to have it "pay" almost immediately.
const MOCK_PAY_AFTER_MS = 15 * 1000

// In-memory store for fake QR state. Fine for local dev/testing — resets
// on server restart, and is never used unless RAZORPAY_MOCK_MODE=true.
const mockQrStore = new Map()

function makeMockQr({ amountInPaise, description, notes, closeBy }) {
  const id = 'qr_mock_' + crypto.randomBytes(8).toString('hex')
  const record = {
    id,
    entity: 'qr_code',
    status: 'active',
    type: 'upi_qr',
    name: 'Tender Registration Fee',
    usage: 'single_use',
    fixed_amount: true,
    payment_amount: amountInPaise,
    description,
    notes: notes || {},
    close_by: closeBy,
    // Placeholder QR image so the frontend's <img src={qr.imageUrl} /> has
    // something real to render. Swap for any placeholder image you like.
    image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
      encodeURIComponent(`mock-upi-payment:${id}:amount=${amountInPaise}`),
    created_at: Math.floor(Date.now() / 1000),
    _mockCreatedAtMs: Date.now(),
    _mockPaid: false,
  }
  mockQrStore.set(id, record)
  return record
}

async function createFixedAmountQr({ amountInPaise, description, notes }) {
  const closeBy = Math.floor(Date.now() / 1000) + QR_TTL_MINUTES * 60

  if (MOCK_MODE) {
    return makeMockQr({ amountInPaise, description, notes, closeBy })
  }

  return razorpay.qrCode.create({
    type: 'upi_qr',
    name: 'Tender Registration Fee',
    usage: 'single_use',
    fixed_amount: true,
    payment_amount: amountInPaise,
    description,
    notes: notes || {},
    close_by: closeBy,
  })
}

async function fetchQr(qrId) {
  if (MOCK_MODE) {
    const record = mockQrStore.get(qrId)
    if (!record) throw new Error(`[mock] QR ${qrId} not found`)
    // Auto-expire past close_by, same as real Razorpay behaviour.
    if (!record._mockPaid && Math.floor(Date.now() / 1000) > record.close_by) {
      record.status = 'closed'
    }
    return record
  }
  return razorpay.qrCode.fetch(qrId)
}

async function fetchQrPayments(qrId) {
  if (MOCK_MODE) {
    const record = mockQrStore.get(qrId)
    if (!record) return []
    if (record.status === 'closed' && !record._mockPaid) return []

    const elapsed = Date.now() - record._mockCreatedAtMs
    if (elapsed < MOCK_PAY_AFTER_MS) return [] // still "pending" from the frontend's POV

    // From here on, report a captured payment for the correct amount so
    // checkQrStatus()'s amount-verification path also gets exercised.
    record._mockPaid = true
    return [
      {
        id: 'pay_mock_' + crypto.createHash('md5').update(qrId).digest('hex').slice(0, 14),
        entity: 'payment',
        status: 'captured',
        amount: record.payment_amount,
        currency: 'INR',
        method: 'upi',
        notes: record.notes,
        created_at: Math.floor(Date.now() / 1000),
      },
    ]
  }

  const res = await razorpay.qrCode.fetchAllPayments(qrId)
  return res.items || []
}

async function closeQr(qrId) {
  if (MOCK_MODE) {
    const record = mockQrStore.get(qrId)
    if (record) record.status = 'closed'
    return record
  }
  return razorpay.qrCode.close(qrId)
}

// ── Webhook signature verification ─────────────────────────────────────────
// Razorpay signs the raw request body with your webhook secret (HMAC SHA256).
// You MUST verify this before trusting any webhook payload.
//
// In mock mode this always returns true since no real webhook will ever
// arrive — payment completion is discovered by polling fetchQrPayments()
// instead (see checkQrStatus in paymentController.js).
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (MOCK_MODE) return true
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  return expected === signatureHeader
}

module.exports = {
  razorpay,
  createFixedAmountQr,
  fetchQr,
  fetchQrPayments,
  closeQr,
  verifyWebhookSignature,
  QR_TTL_MINUTES,
  MOCK_MODE,
}