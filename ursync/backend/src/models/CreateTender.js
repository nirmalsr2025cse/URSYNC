// src/models/CreateTender.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const createTenderSchema = new Schema(
  {
    tenderId : {type: String, required: true , trim: true},
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    districtId: { type: Schema.Types.ObjectId, ref: 'District', required: true },

    location: { type: String, trim: true },
    taluk: { type: String, trim: true },
    village: { type: String, trim: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    startLatitude: { type: Number, default: null },
    startLongitude: { type: Number, default: null },
    endLatitude: { type: Number, default: null },
    endLongitude: { type: Number, default: null },
    tenderRange: { type: Number, default: null }, // range in km

    estimatedValue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    duration: { type: String, trim: true },

    // Project schedule — set by the department employee/head when the
    // tender is drafted (CreateTender.jsx form).
    startDate: { type: Date },
    closingDate: { type: Date },

    // ── Application window (Tender Authority approval step) ────────────
    // These three are NOT set when the tender is drafted — they're
    // null/unset until the Tender Authority approves the tender and
    // supplies them (see createTenderApprovalController.tenderAuthorityApprove).
    applicationStartDate: { type: Date, default: null },
    applicationEndDate: { type: Date, default: null },
    applicationDeadline: { type: Date, default: null },

    // ── Application status ──────────────────────────────────────────────
    // Tracks the tender's public-facing lifecycle once it's Approved:
    //   'Upcoming'  -> startDate hasn't arrived yet (or isn't set)
    //   'Open'      -> now >= startDate (and closingDate hasn't passed, if set)
    //   'Completed' -> now > closingDate
    // Set correctly on every save() via the pre-save hook below. Because
    // Mongo has no concept of "wake up when a date passes", a scheduled
    // job must also periodically call CreateTender.syncApplicationStatuses()
    // (see bottom of file / cron wiring) to flip this field forward for
    // documents that are just sitting untouched while time passes.
    application: {
      type: String,
      enum: ['Upcoming', 'Open', 'Completed'],
      default: 'Upcoming',
      index: true,
    },

    tenderType: { type: String, trim: true, default: 'Open' },
    procurementType: {
      type: String,
      enum: ['Works', 'Goods', 'Services'],
      default: 'Works',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },

    image: { type: String, trim: true },
    documentUrl: { type: String, trim: true },
    documentFileName: { type: String, trim: true, default: '' },
    documentFileSize: { type: Number, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    status: {
      type: String,
      enum: [
        'Draft',
        'Pending Approval',
        'Sent to Head',
        'Sent to Administrator',
        'Sent to Financial',
        'Sent to Tender Authority',
        'Approved',
        'Rejected',
      ],
      default: 'Draft',
    },
    sentTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    isRejected: { type: Boolean, default: false },

    // ── Approval chain (for notification emails) ────────────────────────
    // Every user who has acted on this tender — created it, sent it
    // onward, approved it at any stage — gets an entry here. Used by
    // tenderNotificationService.notifyFinalApproval() to email everyone
    // who touched the tender once the Tender Authority finally approves
    // and publishes it. Entries are append-only and deduped per
    // (userId, stage) pair by addToApprovalChain().
    approvalChain: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        stage: { type: String, required: true }, // e.g. 'Created', 'Sent to Head', 'Tender Authority Approved'
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
)

// ── application auto-transition (based on startDate/closingDate) ──────────
// Runs on every save() so the field is correct immediately at
// creation/update time — e.g. the moment tenderAuthorityApprove() saves the
// doc as 'Approved', this makes sure `application` is already right based
// on whatever startDate was set at draft time. Only applies once the
// tender is Approved; drafts/pending tenders aren't "open" to anyone yet.
createTenderSchema.pre('save', function () {
  if (this.status !== 'Approved') {
    return
  }

  const now = new Date()

  if (this.startDate && now < this.startDate) {
    this.application = 'Upcoming'
  } else if (this.closingDate && now > this.closingDate) {
    this.application = 'Completed'
  } else if (this.startDate && now >= this.startDate) {
    this.application = 'Open'
  }
  // If startDate isn't set, leave whatever value (or default 'Upcoming')
  // is already there.
})

// ── Scheduled maintenance: flip `application` forward as real time passes ──
// Call this periodically (e.g. every 15 min or hourly, via node-cron) so
// Approved tenders no one is actively editing still transition
// Upcoming -> Open -> Completed on schedule, exactly when startDate/
// closingDate arrive. Uses bulk updateMany, so it's cheap even with a
// large collection.
//
// Example wiring (server.js):
//   const cron = require('node-cron')
//   const CreateTender = require('./models/CreateTender')
//   cron.schedule('*/15 * * * *', () =>
//     CreateTender.syncApplicationStatuses().catch(console.error)
//   )
createTenderSchema.statics.syncApplicationStatuses = async function () {
  const now = new Date()

  // Upcoming -> Open: startDate has arrived (and closingDate hasn't passed).
  await this.updateMany(
    {
      status: 'Approved',
      $or: [{ application: 'Upcoming' }, { application: { $exists: false } }],
      startDate: { $lte: now },
      $and: [
        {
          $or: [
            { closingDate: null },
            { closingDate: { $exists: false } },
            { closingDate: { $gte: now } },
          ],
        },
      ],
      isDeleted: false,
    },
    { $set: { application: 'Open' } }
  )

  // Upcoming/Open -> Completed: closingDate has passed.
  await this.updateMany(
    {
      status: 'Approved',
      application: { $ne: 'Completed' },
      closingDate: { $lte: now },
      isDeleted: false,
    },
    { $set: { application: 'Completed' } }
  )
}

// Explicitly bind to the existing "createtenders" collection
module.exports = mongoose.model('CreateTender', createTenderSchema, 'createtenders')