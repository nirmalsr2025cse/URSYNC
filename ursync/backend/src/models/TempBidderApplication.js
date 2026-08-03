// src/models/TempBidderApplication.js
//
// Holds IN-PROGRESS (not yet paid) bidder applications for a tender.
// One document per tenderId; each bidder gets one entry in `applications`.
// Uploaded documents/signature are stored on disk (see
// tempBidderApplicationController.js) — only the file PATH is kept here,
// never the binary, to keep this collection small.
//
// Cleanup: a cron job (see src/jobs/cleanupTempApplications.js) removes any
// application entry whose applicationTime is older than 48 hours AND is
// still unpaid — along with its uploaded files. Paid applications should be
// migrated to a permanent collection by your payment-success handler and
// removed from here at that point (see markPaid below / TODO).

const mongoose = require('mongoose')
const { Schema } = mongoose

const applicationEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // All the applicant-entered text fields from ApplyTenderForm, stored
    // as-is (matches the frontend `form` state shape) so it can be sent
    // straight back to prefill the form.
    formData: { type: Schema.Types.Mixed, default: {} },

    // Uploaded JPEGs — file path on disk, not the binary.
    documents: [
      {
        label: { type: String, required: true }, // e.g. "PAN Card Upload"
        filePath: { type: String, required: true },
        originalName: { type: String },
      },
    ],
    signatureFilePath: { type: String, default: null },

    isPaid: { type: Boolean, default: false },
    applicationDate: { type: String }, // yyyy-mm-dd, for display
    applicationTime: { type: Date, default: Date.now }, // used for 48h cleanup
  },
  { _id: false, timestamps: true }
)

const tempBidderApplicationSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    applications: [applicationEntrySchema],
  },
  { timestamps: true }
)

tempBidderApplicationSchema.index({ tenderId: 1, 'applications.userId': 1 })

module.exports = mongoose.model(
  'TempBidderApplication',
  tempBidderApplicationSchema,
  'tempbidderapplications'
)