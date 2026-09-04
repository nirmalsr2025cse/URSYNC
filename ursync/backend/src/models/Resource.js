// src/models/Resource.js
//
// A "Resource" is the thing users request via GetResourcePage.jsx.
// Every application is stored in the ResourceRequest collection and linked
// from resource.applications[] by requestId. The embedded entry continues
// to support resource availability and approval bookkeeping:
//   - GetResourcePage.jsx      -> POST /api/resources/:id/apply
//   - AppliedResourcesPage.jsx -> GET  /api/resource-requests/mine
//
// availableCount / bookedCount bookkeeping:
//   - `available`  = total units of this resource that exist
//   - `booked`     = how many units are currently committed (Approved apps)
//   - effective free units for new applications = available - booked
//
// applications[] acts as the waiting list:
//   - status "Pending"  -> just applied, waiting for admin decision
//   - status "Approved" -> counted against `booked`
//   - status "Rejected" -> does not count against `booked`
const mongoose = require('mongoose')
const { Schema } = mongoose

const applicationSchema = new Schema(
  {
    // Who applied. Server derives this from req.user._id — never trust
    // a client-supplied userId.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestId: { type: Schema.Types.ObjectId, ref: 'ResourceRequest', default: null },

    requiredFrom: { type: Date, required: true },
    requiredTo: { type: Date, required: true },

    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },

    // Free-text note an admin can leave when approving/rejecting
    // (e.g. reason for rejection). Optional.
    remarks: { type: String, trim: true, default: '' },

    decidedAt: { type: Date, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true, // createdAt on an application = "applied at"
  }
)

const resourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },

    category: { type: String, trim: true, default: '' },
    district: { type: Schema.Types.ObjectId, ref: 'District', default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },

    // Total units of this resource that exist.
    available: { type: Number, required: true, min: 0, default: 0 },

    // How many units are currently committed to Approved applications.
    // Kept as a stored counter (rather than computed on every read) so
    // list/search pages can filter/sort on it directly. Kept in sync by
    // the controller whenever an application's status changes.
    booked: { type: Number, required: true, min: 0, default: 0 },

    // Waiting list / application history for this resource.
    applications: { type: [applicationSchema], default: [] },

    // Users who have applied for this resource.
    applied: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// Convenience virtual: units still free to request right now.
resourceSchema.virtual('remaining').get(function () {
  return Math.max(0, (this.available || 0) - (this.booked || 0))
})
resourceSchema.set('toJSON', { virtuals: true })
resourceSchema.set('toObject', { virtuals: true })

// Helpful for "find all applications by this user across all resources"
// queries used by getMyRequests.
resourceSchema.index({ 'applications.userId': 1 })

module.exports = mongoose.model('Resource', resourceSchema)