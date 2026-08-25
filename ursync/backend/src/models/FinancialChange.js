// src/models/FinancialChange.js
// One document per tenderCode. Every time a financial-change request is
// raised for that tender, a new entry is pushed into appliedChanges rather
// than creating a second document — so "does a request already exist for
// this tender" is just "does a FinancialChange doc with this tenderCode
// exist", and the full history of requests for that tender lives in one
// place.
const mongoose = require('mongoose')
const { Schema } = mongoose

const appliedChangeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateOfChange: { type: Date, default: Date.now },
    originalCost: { type: Number, required: true },
    revisedCost: { type: Number, required: true },
    amount: { type: Number, required: true }, // revisedCost - originalCost, kept denormalized for quick display
    remarks: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
  },
  { _id: true, timestamps: true }
)

const financialChangeSchema = new Schema(
  {
    tenderCode: { type: String, required: true, unique: true, trim: true, index: true },
    appliedChanges: { type: [appliedChangeSchema], default: [] },
  },
  { timestamps: true }
)

module.exports = mongoose.model('FinancialChange', financialChangeSchema)