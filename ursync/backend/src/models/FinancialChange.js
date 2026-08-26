// src/models/FinancialChange.js
//
// One document per tenderCode. Every time a department head successfully
// changes a tender's amount (originalAmount !== revisedAmount), a new
// entry is PUSHED onto `amountchanges`. If no document exists yet for
// that tenderCode, one is created with a single entry.
//
// Shape (matches the requested spec):
// {
//   _id,
//   tenderCode,
//   amountchanges: [
//     { originalAmount, revisedAmount, date, time }, ...
//   ]
// }
const mongoose = require('mongoose')
const { Schema } = mongoose

const amountChangeSchema = new Schema(
  {
    originalAmount: { type: Number, required: true },
    revisedAmount: { type: Number, required: true },
    // Stored as separate date/time strings (as requested) in addition to
    // relying on the natural createdAt if ever needed.
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