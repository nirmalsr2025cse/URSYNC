// src/models/Debarment.js
// Matches the ACTUAL documents in URSYNC.debarments: debarmentCode, userId
// (ref User), accountType, startDate/endDate, organizationChain (org-only),
// productCategory (individual-only, nullable), reason, debarredBy (ref User),
// isActive.
const mongoose = require('mongoose')
const { Schema } = mongoose

const debarmentSchema = new Schema(
  {
    debarmentCode: { type: String, required: true, unique: true, trim: true }, // e.g. "DBR-2026-005"

    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Denormalized copy of the debarred user's accountType at the time of
    // debarment — kept on the debarment doc itself (not just derived via
    // populate) so historical records stay accurate even if the user's
    // account type is ever changed later.
    accountType: {
      type: String,
      enum: ['Individual', 'Organization'],
      required: true,
    },

    startDate: { type: Date, required: true, index: true }, // "Debarment Date"
    endDate: { type: Date, required: true, index: true },   // "Expiry Date"

    organizationChain: { type: String, trim: true, default: null }, // Organization accounts only
    productCategory: { type: String, trim: true, default: null },   // Individual accounts only

    reason: { type: String, trim: true },

    debarredBy: { type: Schema.Types.ObjectId, ref: 'User' },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

debarmentSchema.index({ accountType: 1, isActive: 1 })

module.exports = mongoose.model('Debarment', debarmentSchema)