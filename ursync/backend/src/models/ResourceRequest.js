const mongoose = require('mongoose')
const { Schema } = mongoose

const resourceRequestSchema = new Schema(
  {
    resource: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
    resourceId: { type: String, required: true, trim: true },
    resourceName: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    requiredQuantity: { type: Number, required: true, min: 1, default: 1 },
    applicantName: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    organization: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    projectName: { type: String, required: true, trim: true },
    projectId: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    requiredFrom: { type: Date, required: true },
    requiredTo: { type: Date, required: true },
    contactNumber: { type: String, required: true, trim: true },
    remarks: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'resourcerequests' }
)

resourceRequestSchema.index({ requestedBy: 1, createdAt: -1 })
resourceRequestSchema.index({ resource: 1, status: 1 })

module.exports = mongoose.model('ResourceRequest', resourceRequestSchema)
