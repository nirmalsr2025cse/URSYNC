// src/models/PaymentEvent.js
//
// Append-only audit log for every meaningful event in the payment lifecycle.
// Covers reporting/reconciliation needs (#20), admin visibility (#18), and
// gives you a paper trail to diagnose "success shown in app but backend
// pending" type mismatches (#4) after the fact. Never update or delete
// entries here — only insert.

const mongoose = require('mongoose')
const { Schema } = mongoose

const paymentEventSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', index: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User', index: true },

    event: {
      type: String,
      required: true,
      enum: [
        'qr_created',
        'qr_reused',
        'qr_creation_failed',
        'qr_expired',
        'status_poll',
        'payment_captured',
        'payment_amount_mismatch',
        'payment_duplicate_ignored',
        'migration_success',
        'migration_failed',
        'webhook_received',
        'webhook_invalid_signature',
        'webhook_unreconciled', // couldn't map payment back to a tender/user
        'blocked_tender_not_open',
        'blocked_user_ineligible',
        'blocked_already_paid',
        'blocked_no_draft',
      ],
    },

    razorpayQrId:      { type: String },
    razorpayPaymentId: { type: String },
    amount:            { type: Number }, // paise
    message:           { type: String },
    meta:              { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

paymentEventSchema.index({ createdAt: -1 })

module.exports = mongoose.model('PaymentEvent', paymentEventSchema, 'paymentevents')

// Convenience logger — swallows its own errors so a logging failure never
// breaks the actual payment flow.
module.exports.log = async function log(event, fields = {}) {
  try {
    await module.exports.create({ event, ...fields })
  } catch (err) {
    console.error('[PaymentEvent] failed to log', event, err.message)
  }
}