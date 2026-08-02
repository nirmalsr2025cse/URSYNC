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
    duration: { type: String, trim: true, default: '' },

    // ── Project schedule ─────────────────────────────────────────────────
    // Copied straight from the CreateTender draft (set by the department
    // employee/head when the tender was first created) — NOT re-entered by
    // the Tender Authority at approval time. This is now ALSO what drives
    // the `application` field below (Upcoming/Open/Completed), instead of
    // the separate applicationStartDate/applicationDeadline window.
    startDate: { type: Date },
    closingDate: { type: Date, required: true, index: true },

    estimatedValue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    // ── Application window (entered by the Tender Authority) ───────────
    // Still stored for record-keeping / audit trail purposes, supplied by
    // the Tender Authority at approval time
    // (createTenderApprovalController.tenderAuthorityApprove). NOTE: these
    // three fields no longer drive the `application` status below — that's
    // now based on startDate/closingDate instead (see pre-save hook and
    // syncApplicationStatuses further down).
    applicationStartDate: { type: Date },
    applicationEndDate: { type: Date },
    applicationDeadline: { type: Date },

    // Tracks where the tender's application/public-visibility window
    // currently stands, based on startDate/closingDate:
    //   'Upcoming'  -> now < startDate (or startDate not set)
    //   'Open'      -> now >= startDate (and closingDate hasn't passed, if set)
    //   'Completed' -> now > closingDate
    // Set correctly on every save() via the pre-save hook below. Because
    // Mongo has no concept of "wake up when a date passes", a scheduled
    // job must also periodically call Tender.syncApplicationStatuses()
    // (see bottom of file / cron script) to flip this field forward for
    // documents that are just sitting untouched while time passes.
    application: {
      type: String,
      enum: ['Upcoming', 'Open', 'Completed'],
      default: 'Upcoming',
      index: true,
    },

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

// ── Business-rule enforcement + application-window auto-transition ────────
// Single merged pre-save hook (no `next` parameter — see note in git
// history if you're wondering why: declaring a `next` arg here previously
// caused a "TypeError: next is not a function" crash inside Kareem's
// execPre in this project's Mongoose version; a zero-arg synchronous hook
// sidesteps that entirely).
tenderSchema.pre('save', function () {
  // ── 1. Cancel / Retender mutual exclusivity ────────────────────────────
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

  // ── 2. Application auto-transition (based on applicationStartDate/applicationDeadline) ────
  // Runs on every save() so the field is correct immediately at
  // creation/update time — e.g. the moment tenderAuthorityApprove()
  // inserts this document with the Tender Authority's supplied
  // applicationStartDate/applicationDeadline, `application` is already
  // right based on those dates (NOT the project startDate/closingDate).
  const now = new Date()

  if (this.applicationStartDate && now < this.applicationStartDate) {
    this.application = 'Upcoming'
  } else if (this.applicationDeadline && now > this.applicationDeadline) {
    this.application = 'Completed'
  } else if (this.applicationStartDate && now >= this.applicationStartDate) {
    this.application = 'Open'
  }
  // If applicationStartDate isn't set, leave whatever value (or default
  // 'Upcoming') is already there.
})

// ── Scheduled maintenance: flip `application` forward as real time passes ──
// Call this periodically (e.g. every minute/15 min/hourly, via node-cron)
// so tenders no one is actively editing still transition
// Upcoming -> Open -> Completed on schedule, based on startDate/
// closingDate. Uses bulk updateMany, so it's cheap even with a large
// collection.
//
// Example wiring (server.js or a jobs/*.js file):
//   const cron = require('node-cron')
//   const Tender = require('./models/Tender')
//   cron.schedule('*/1 * * * *', () => Tender.syncApplicationStatuses().catch(console.error))
tenderSchema.statics.syncApplicationStatuses = async function () {
  const now = new Date()

  // Upcoming -> Open: applicationStartDate has arrived (and
  // applicationDeadline hasn't passed). The $or on `application` and the
  // $exists checks on `applicationDeadline` guard against documents where
  // the field may be missing entirely rather than explicitly null — Mongo
  // treats "missing" and "null" differently in queries.
  await this.updateMany(
    {
      $or: [{ application: 'Upcoming' }, { application: { $exists: false } }],
      applicationStartDate: { $lte: now },
      $and: [
        {
          $or: [
            { applicationDeadline: null },
            { applicationDeadline: { $exists: false } },
            { applicationDeadline: { $gte: now } },
          ],
        },
      ],
      isDeleted: false,
    },
    { $set: { application: 'Open' } }
  )

  // Upcoming/Open -> Completed: applicationDeadline has passed.
  await this.updateMany(
    {
      application: { $ne: 'Completed' },
      applicationDeadline: { $lte: now },
      isDeleted: false,
    },
    { $set: { application: 'Completed' } }
  )
}

tenderSchema.index({ status: 1, closingDate: -1 })
tenderSchema.index({ isCancelled: 1, isRetendered: 1 })
tenderSchema.index({ title: 'text', location: 'text', tenderCode: 'text' })

module.exports = mongoose.model('Tender', tenderSchema)