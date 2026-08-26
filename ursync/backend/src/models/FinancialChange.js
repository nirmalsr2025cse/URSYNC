// src/models/FinancialChange.js
//
// One document per tenderCode. Every time a financial change request is
// raised for a tender, a new entry is PUSHED onto `amountchanges`. The
// Tender Financial Changes page only ever cares about the LAST entry in
// this array — that's what drives the Original Cost / Revised Cost /
// Reason shown on the card.
//
// NOTE: `reason` and `priority` were added to the original spec you gave
// me because the frontend card needs to render a Reason line and (per the
// screenshot) a priority badge, and neither of those exist anywhere on
// the Tender model itself. If you're already capturing these elsewhere,
// swap the controller's field names to match instead of touching this
// schema.
const mongoose = require('mongoose')
const { Schema } = mongoose

const amountChangeSchema = new Schema(
  {
    originalAmount: { type: Number, required: true },
    revisedAmount: { type: Number, required: true },
    reason: { type: String, trim: true, default: '' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    date: { type: String, required: true }, // e.g. "2026-08-26"
    time: { type: String, required: true }, // e.g. "14:32:10"
  },
  { _id: false }
)

const financialChangeSchema = new Schema(
  {
    tenderCode: { type: String, required: true, unique: true, trim: true, index: true },
    amountchanges: { type: [amountChangeSchema], default: [] },
  },
  { timestamps: true }
)

module.exports = mongoose.model('FinancialChange', financialChangeSchema)