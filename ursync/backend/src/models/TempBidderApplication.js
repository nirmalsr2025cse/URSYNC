// src/models/TempBidderApplication.js
//
// Holds IN-PROGRESS (not yet paid) bidder applications for a tender.
// One document per tenderId; each bidder gets one entry in `applications`.
//
// Each entry now carries its own `applicationId` (generated the first time
// the bidder saves), independent of tenderId/userId. This is the third leg
// of the mapping — every GridFS file this bidder uploads for this tender is
// tagged with { userId, tenderId, applicationId } in its metadata (see
// uploadBufferToGridFS calls in the controller), so a file can always be
// traced back to the exact application it belongs to, not just the
// user+tender pair. applicationId is also what carries over unchanged when
// the entry is migrated into the `bidderlists` collection on payment.
//
// Uploaded documents/signature (JPG, PNG, or PDF) are stored IN MongoDB via
// GridFS (see config/gridfs.js) — this schema only keeps a reference
// (fileId) into the `bidderDocuments.files` / `bidderDocuments.chunks`
// collections, not the binary itself.
//
// Files are written to GridFS ONLY when the user clicks Save (or Next,
// which also persists) — see controllers/tempBidderApplicationController.js.
// Nothing is written on page load; page load only reads back what was
// previously saved so it can be re-rendered.
//
// Cleanup: a cron job (see jobs/cleanupTempApplications.js) removes any
// application entry whose applicationTime is older than 48 hours AND is
// still unpaid — deleting its GridFS files (chunks + files docs) first,
// then removing the entry from this collection (and the parent document if
// it becomes empty). Paid applications are migrated into the `bidderlists`
// collection by markPaid() in the controller, which also removes the entry
// from here so the 48h cleanup job never has to think about paid entries.

const mongoose = require('mongoose')
const { Schema } = mongoose

const documentSchema = new Schema(
  {
    label: { type: String, required: true }, // e.g. "PAN Card Upload"
    fileId: { type: Schema.Types.ObjectId, required: true }, // → bidderDocuments.files._id
    originalName: { type: String },
    contentType: { type: String, required: true }, // image/jpeg, image/png, application/pdf
    size: { type: Number }, // bytes, for display without a round trip to GridFS
  },
  { _id: false }
)

const applicationEntrySchema = new Schema(
  {
    // Stable id for this bidder's application to this tender — generated
    // once (see getOrCreateEntry in the controller) and reused across every
    // subsequent Save. Distinct from Mongo's own _id since this schema uses
    // { _id: false } subdocuments; this is what ties GridFS file metadata,
    // this temp entry, and the eventual bidderlists row together.
    applicationId: { type: Schema.Types.ObjectId, required: true },

    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // All the applicant-entered text fields from ApplyTenderForm, stored
    // as-is (matches the frontend `form` state shape) so it can be sent
    // straight back to prefill the form.
    formData: { type: Schema.Types.Mixed, default: {} },

    documents: { type: [documentSchema], default: [] },

    signatureFileId: { type: Schema.Types.ObjectId, default: null },
    signatureContentType: { type: String, default: null },
    signatureOriginalName: { type: String, default: null },

    isPaid: { type: Boolean, default: false },
    paymentId: { type: String, default: null },

    applicationDate: { type: String }, // yyyy-mm-dd, for display
    applicationTime: { type: Date, default: Date.now }, // used for 48h cleanup window
    applicationSubmissionDateTime: { type: Date, default: null }, // set on Next → payment step
  },
  { _id: false, timestamps: true }
)

const tempBidderApplicationSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    applications: { type: [applicationEntrySchema], default: [] },
  },
  { timestamps: true }
)

tempBidderApplicationSchema.index({ tenderId: 1, 'applications.userId': 1 })
tempBidderApplicationSchema.index({ 'applications.applicationId': 1 })

module.exports = mongoose.model(
  'TempBidderApplication',
  tempBidderApplicationSchema,
  'tempbidderapplications'
)