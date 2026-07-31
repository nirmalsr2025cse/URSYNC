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
    documentUrl: { type: String, trim: true, default: null }, // link/path to the tender document PDF

    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    districtId: { type: Schema.Types.ObjectId, ref: 'District' },

    procurementType: { type: String, enum: ['Works', 'Goods', 'Services'] },
    productCategory: { type: String, trim: true, default: '' }, // free-text sub-category, used by classification search/filter
    location: { type: String, trim: true },
    taluk: { type: String, trim: true, default: '' },
    village: { type: String, trim: true, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    duration: {type: String, trim: true , default: ''},

    estimatedValue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    startDate: { type: Date },
    applicationDeadline: { type: Date },
    closingDate: { type: Date, required: true, index: true },

    status: {
      type: String,
      // Cancel/retender are tracked separately via isCancelled/isRetendered
      // below — status itself only ever reflects the tender's real
      // lifecycle stage, frozen at whatever it was when cancelled, or
      // reset to Ongoing/Upcoming when retendered. It is never
      // "Cancelled" or "Retendered" itself.
      enum: ['Ongoing', 'Upcoming', 'Completed'],
      required: true,
      default: 'Upcoming',
      index: true,
    },

    // ── Cancel / Retender flags ─────────────────────────────────────────
    // Mutually exclusive by design (enforced in the pre-save hook below):
    //   - isCancelled: true  -> status is frozen at whatever it was the
    //     moment it was cancelled; never changes again.
    //   - isRetendered: true -> isCancelled is forced false, and status is
    //     forced to Ongoing or Upcoming (a retender is a fresh cycle, so
    //     it can never be Completed).
    isCancelled: { type: Boolean, default: false, index: true },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledReason: { type: String, trim: true, default: null },

    isRetendered: { type: Boolean, default: false, index: true },
    retenderedAt: { type: Date, default: null },
    retenderedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Points back to the original tender this one supersedes, when this
    // document IS the new retender cycle (as opposed to just flagging the
    // old one). Optional — only set if you create a fresh tender doc per
    // retender rather than reusing the same one.
    originalTenderId: { type: Schema.Types.ObjectId, ref: 'Tender', default: null },

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

// ── Business-rule enforcement ─────────────────────────────────────────────
// Runs on every .save()/.create() so the mutual-exclusivity and
// status-consistency rules can never be violated by application code,
// regardless of which controller touches this document.
tenderSchema.pre('save', function (next) {
  if (this.isCancelled && this.isRetendered) {
    // Cancelling always wins if both were somehow set at once — a
    // retender is only valid once cancellation is cleared.
    this.isRetendered = false
    this.retenderedAt = null
    this.retenderedBy = null
  }

  if (this.isCancelled) {
    // status is intentionally left untouched here — it stays frozen at
    // whatever it already was (Ongoing/Upcoming/Completed) at the moment
    // of cancellation. Controllers should not modify status when setting
    // isCancelled=true.
    if (!this.cancelledAt) this.cancelledAt = new Date()
  }

  if (this.isRetendered) {
    this.isCancelled = false
    this.cancelledAt = null
    this.cancelledBy = null
    this.cancelledReason = null
    if (!this.retenderedAt) this.retenderedAt = new Date()

    // A retender is a fresh cycle — it can never be "Completed". If a
    // controller tries to retender a Completed tender without also
    // updating status, default it forward to Upcoming rather than
    // silently leaving an invalid Completed+Retendered combination.
    if (this.status === 'Completed') {
      this.status = 'Upcoming'
    }
  }

  next()
})

tenderSchema.index({ status: 1, closingDate: -1 })
tenderSchema.index({ isCancelled: 1, isRetendered: 1 })
tenderSchema.index({ title: 'text', location: 'text', tenderCode: 'text' })

module.exports = mongoose.model('Tender', tenderSchema)