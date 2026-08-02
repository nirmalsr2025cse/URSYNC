// src/models/Rejection.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const rejectionSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'CreateTender', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    // Naming kept exactly as specified — this is the user who performed
    // the rejection (department_head rejecting an employee's tender, or
    // administrator rejecting a head's tender), not a "cancel" action.
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cancelledByRole: { type: String, required: true, trim: true }, // e.g. "Department Head"
    Reason: { type: String, required: true, trim: true },
    RejectedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Rejection', rejectionSchema, 'rejections')