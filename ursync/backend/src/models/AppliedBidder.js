// src/models/AppliedBidder.js
//
// PERMANENT record of a completed (paid) tender application. Created by
// paymentController.js the moment a payment is confirmed (QR paid or,
// tomorrow, the mobile-app-payment flow). Mirrors the shape of a
// TempBidderApplication `applications[]` entry, plus payment fields, so
// existing code that reads formData/documents/signatureFilePath keeps
// working unchanged.
//
// After migration, the corresponding TempBidderApplication entry for this
// user+tender is removed (see paymentController.confirmPayment) so a user
// can't "pay again" for the same draft and so the 48h cleanup job never
// has to think about paid entries at all.

const mongoose = require('mongoose')
const { Schema } = mongoose

const appliedBidderSchema = new Schema(
  {
    tenderId:     { type: Schema.Types.ObjectId, ref: 'Tender', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Same shape as ApplyTenderForm's `form` state.
    formData: { type: Schema.Types.Mixed, default: {} },

    documents: [
      {
        label:        { type: String, required: true },
        filePath:     { type: String, required: true },
        originalName: { type: String },
      },
    ],
    signatureFilePath: { type: String, default: null },

    applicationDate: { type: String }, // yyyy-mm-dd
    applicationTime: { type: Date, default: Date.now },

    // ── Payment details ──────────────────────────────────────────────────
    paymentMethod: { type: String, enum: ['upi_qr', 'upi_mobile'], default: 'upi_qr' },
    razorpayQrId:      { type: String },
    razorpayPaymentId: { type: String, required: true, unique: true },
    razorpayOrderId:   { type: String }, // present if you switch to Orders API later
    amountPaid:        { type: Number, required: true }, // in paise
    paidAt:            { type: Date, default: Date.now },
  },
  { timestamps: true }
)

appliedBidderSchema.index({ tenderId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('AppliedBidder', appliedBidderSchema, 'appliedbidders')