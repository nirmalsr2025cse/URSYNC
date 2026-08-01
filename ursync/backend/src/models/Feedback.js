// src/models/Feedback.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const feedbackSchema = new Schema(
  {
    feedbackCode: { type: String, required: true, unique: true, trim: true },
    // Feedback can come from an unregistered/anonymous bidder, so userId is
    // nullable — userNameLabel is what's actually displayed either way.
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userNameLabel: { type: String, trim: true, default: 'Anonymous Bidder' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    // Points at the real tenders collection (src/models/Tender.js), whose
    // display code lives in `tenderCode` (e.g. "TN/PWD/2026/001") — NOT
    // the separate CreateTender draft-workflow model, which is an
    // unrelated collection with a different `tenderId` field.
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender' },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Resolved'],
      default: 'Pending',
    },
    submittedDate: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Feedback', feedbackSchema)