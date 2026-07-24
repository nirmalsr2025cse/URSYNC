// src/models/Tender.js
// Matches the ACTUAL documents already sitting in URSYNC.tenders — refs to
// Department/Category/District, estimatedValue as a Number, no denormalized
// display strings. The controller resolves those refs via $lookup and
// reshapes the response so the frontend (TenderCard.jsx / Home.jsx) doesn't
// need to change at all.
const mongoose = require('mongoose')
const { Schema } = mongoose

const tenderSchema = new Schema(
  {
    tenderCode: { type: String, required: true, unique: true, trim: true }, // e.g. "TN/PWD/2026/001"

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    documentUrl: { type: String, trim: true, default: null },

    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    districtId: { type: Schema.Types.ObjectId, ref: 'District', required:true },

    procurementType: { type: String, enum: ['Works', 'Goods', 'Services'] },
    location: { type: String, trim: true },

    estimatedValue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    startDate: { type: Date },
    applicationDeadline: { type: Date },
    closingDate: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: ['Ongoing', 'Upcoming', 'Completed', 'Cancelled', 'Retendered'],
      required: true,
      default: 'Upcoming',
      index: true,
    },

    sentToDept: { type: Boolean, default: false },
    sentDate: { type: Date },
    approvedApplicationCount: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
)

tenderSchema.index({ status: 1, closingDate: -1 })
tenderSchema.index({ title: 'text', location: 'text', tenderCode: 'text' })

module.exports = mongoose.model('Tender', tenderSchema)