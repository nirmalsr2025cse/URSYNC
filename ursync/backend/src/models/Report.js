// src/models/Report.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const reportSchema = new Schema(
  {
    reportCode: { type: String, required: true, unique: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    reportedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalized label kept alongside reportedByUserId so the report still
    // reads sensibly even if the reporting user's account is later removed.
    reporterRoleLabel: { type: String, trim: true },
    // Points at the real tenders collection (src/models/Tender.js), whose
    // display code lives in `tenderCode` (e.g. "TN/PWD/2026/001") — NOT
    // the separate CreateTender draft-workflow model, which is an
    // unrelated collection with a different `tenderId` field.
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    submittedDate: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Report', reportSchema)