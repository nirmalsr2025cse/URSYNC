// src/models/Tender.js
// Matches the ACTUAL documents already sitting in URSYNC.tenders — refs to
// Department/Category/District, estimatedValue as a Number, no denormalized
// display strings. The controller resolves those refs via $lookup and
// reshapes the response so the frontend (TenderCard.jsx / Home.jsx) doesn't
// need to change at all.
//
// *** UPDATED for the Apply Financial Changes feature: added `financialField`
// *** (see the block below) — everything else is unchanged from before.
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
    // the Tender Authority at approval time.
    startDate: { type: Date },
    closingDate: { type: Date, required: true, index: true },

    estimatedValue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    // ── Application window (entered by the Tender Authority) ───────────
    // Supplied by the Tender Authority at approval time
    // (createTenderApprovalController.tenderAuthorityApprove). These are
    // TWO SEPARATE triggers for the `application` tab status below —
    // they are NOT a simple start/end pair:
    //
    //   applicationStartDate  -> kept for record-keeping only, does not
    //                            drive `application`.
    //   applicationEndDate    -> once this passes, the tender moves to
    //                            'Open'.
    //   applicationDeadline   -> once THIS passes, the tender moves to
    //                            'Completed' (and is no longer 'Open').
    applicationStartDate: { type: Date },
    applicationEndDate: { type: Date },
    applicationDeadline: { type: Date },

    // Tracks where the tender's application/public-visibility window
    // currently stands:
    //   'Upcoming'  -> now < applicationEndDate (or applicationEndDate not set)
    //   'Open'      -> applicationEndDate has passed, but applicationDeadline
    //                  has not
    //   'Completed' -> now >= applicationDeadline
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

    // Set true once the Tender Authority clicks "Send to Department" on
    // the Approved Applicants screen (applicationApplicantsController.
    // sendToDepartment). Once true, the tender ALWAYS shows in the
    // Completed tab on the Applications page, regardless of
    // applicationEndDate/applicationDeadline — see tenderListController.js
    // computeTab()/tabQueryCondition().
    isDocumentVerified: { type: Boolean, default: false, index: true },

    isFinalizedBidders: { type: Boolean, default: false, index: true },

    // ── Financial change tracking (Apply Financial Changes feature) ──────
    // false -> tender shows in the "Apply" tab on the Tender Financial
    //          Changes page (no financial change request raised yet, or
    //          none currently active).
    // true  -> tender shows in the "Applied" tab instead. Flipped to true
    //          by financialChangeController.applyFinancialChange() the
    //          moment a request is first raised for this tender, and the
    //          full history of requests lives in the companion
    //          FinancialChange collection (one doc per tenderCode).
    financialField: { type: Boolean, default: false, index: true },

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

  // ── 2. Application tab auto-transition ────────────────────────────────
  // TWO SEPARATE triggers, not a start/end pair:
  //   - applicationEndDate passing moves Upcoming -> Open
  //   - applicationDeadline passing moves (Upcoming or Open) -> Completed
  // applicationDeadline is checked FIRST and wins outright, since a
  // tender whose deadline has already passed must never show as Open
  // even if applicationEndDate also already passed.
  //
  // NOTE: this stored `application` field is a separate concern from the
  // LIVE-computed tab used by tenderListController.js (which additionally
  // factors in isDocumentVerified). Do not assume the two always agree —
  // the controller's computeTab() is the source of truth for what the
  // Applications page tab bar actually shows.
  const now = new Date()

  if (this.applicationDeadline && now >= this.applicationDeadline) {
    this.application = 'Completed'
  } else if (this.applicationEndDate && now >= this.applicationEndDate) {
    this.application = 'Open'
  } else if (this.applicationEndDate) {
    this.application = 'Upcoming'
  }
  // If applicationEndDate isn't set at all, leave whatever value (or
  // default 'Upcoming') is already there.
})

// ── Scheduled maintenance: fully RECOMPUTE `application` from the actual
// dates on every run ─────────────────────────────────────────────────────
// IMPORTANT: this does NOT just nudge documents forward (Upcoming -> Open
// -> Completed). It recomputes `application` unconditionally from
// applicationEndDate/applicationDeadline for every document, regardless of
// what `application` currently says. That matters because documents
// inserted directly into MongoDB (seed scripts, manual inserts, imports)
// never pass through the pre-save hook above, so their `application`
// field can be flat-out wrong from the moment they're created — e.g. a
// doc hardcoded with application: 'Open' whose applicationEndDate is
// actually still days in the future. A one-directional "only move
// forward" sync can never fix that; only an unconditional recompute can.
//
// Call this periodically (e.g. every minute/15 min/hourly, via node-cron)
// and it's also called inline at the top of every /applications request
// (see tenderListController.js) so tabs are always correct even between
// cron ticks.
//
// Example wiring (server.js or a jobs/*.js file):
//   const cron = require('node-cron')
//   const Tender = require('./models/Tender')
//   cron.schedule('*/1 * * * *', () => Tender.syncApplicationStatuses().catch(console.error))
tenderSchema.statics.syncApplicationStatuses = async function () {
  const now = new Date()

  // Completed: applicationEndDate has passed.
  await this.updateMany(
    {
      applicationEndDate: { $lte: now },
      application: { $ne: 'Completed' },
      isDeleted: false,
    },
    { $set: { application: 'Completed' } }
  )

  // Open: applicationStartDate has passed, but applicationEndDate hasn't
  // (or isn't set).
  await this.updateMany(
    {
      applicationStartDate: { $lte: now },
      $or: [
        { applicationEndDate: null },
        { applicationEndDate: { $exists: false } },
        { applicationEndDate: { $gt: now } },
      ],
      application: { $ne: 'Open' },
      isDeleted: false,
    },
    { $set: { application: 'Open' } }
  )

  // Upcoming: applicationStartDate hasn't arrived yet (or isn't set).
  await this.updateMany(
    {
      $or: [
        { applicationStartDate: null },
        { applicationStartDate: { $exists: false } },
        { applicationStartDate: { $gt: now } },
      ],
      application: { $ne: 'Upcoming' },
      isDeleted: false,
    },
    { $set: { application: 'Upcoming' } }
  )
}

tenderSchema.index({ status: 1, closingDate: -1 })
tenderSchema.index({ isCancelled: 1, isRetendered: 1 })
tenderSchema.index({ title: 'text', location: 'text', tenderCode: 'text' })

module.exports = mongoose.model('Tender', tenderSchema)