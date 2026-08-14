// src/models/BiddersList.js
//
// PERMANENT record of a submitted tender application. Written by
// submitApplication() in tempBidderApplicationController.js the moment the
// bidder clicks "Next" on ApplyTenderForm.jsx (payment happens separately /
// later — this collection is the source of truth for "has this user
// already applied to this tender", independent of payment status).
// Mirrors the shape of a TempBidderApplication `applications[]` entry
// (same applicationId carried over, same fileId references into GridFS)
// so the already-uploaded documents/signature don't need to be re-uploaded
// or copied — they just get re-tagged as permanent.
//
// Collection name is deliberately "bidderlists".
//
// After migration, the corresponding TempBidderApplication entry for this
// user+tender is removed by submitApplication() so a user can't re-save a
// draft for a tender they already submitted, and so the 48h cleanup job
// never has to think about submitted entries at all.
//
// The unique { tenderId, userId } index below is what guarantees a given
// user can only ever have ONE record for a given tender — and it's exactly
// what applyTenderController.listApplyTenders queries to exclude
// already-applied tenders from that user's Apply Tenders list.
//
// isDocumentApproved / isBidderApproved — reviewer-facing flags set by
// admin staff after the fact (e.g. from a "Review Applications" screen).
// They default to false the moment a bidder submits (clicks "Next"), and
// nothing in the apply flow itself ever sets them true — that happens in
// whatever admin/reviewer endpoint is built to approve documents/bidders.

const mongoose = require('mongoose')
const { Schema } = mongoose

const documentSchema = new Schema(
  {
    label: { type: String, required: true },
    fileId: { type: Schema.Types.ObjectId, required: true }, // → bidderDocuments.files._id
    originalName: { type: String },
    contentType: { type: String, required: true },
    size: { type: Number },
  },
  { _id: false }
)

const applicationEntrySchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    formData: { type: Schema.Types.Mixed, default: {} },
    documents: { type: [documentSchema], default: [] },
    signatureFileId: { type: Schema.Types.ObjectId, default: null },
    signatureContentType: { type: String, default: null },
    signatureOriginalName: { type: String, default: null },
    isPaid: { type: Boolean, default: false },
    paymentId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    applicationDate: { type: String },
    applicationTime: { type: Date },
    applicationSubmissionDateTime: { type: Date, default: Date.now },

    // ── Reviewer approval flags ─────────────────────────────────────────
    // Set to false automatically on submission; flipped to true later by
    // an admin/reviewer action (not part of the apply flow).
    isDocumentApproved: { type: Boolean, default: false },
    isBidderApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const biddersListSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },

    // One BiddersList document holds MANY bidders for a tender (one entry
    // per user in `applications[]`). status/paymentId/paidAt/applicationDate
    // are therefore per-bidder concerns and live ONLY inside each
    // applications[] entry (isPaid/paymentId/paidAt/applicationDate above) —
    // do NOT re-add top-level versions of these fields. A previous version
    // of this schema had them at the top level too, which meant every new
    // bidder's submission silently clobbered the previous bidder's
    // status/paymentId/paidAt for the whole tender. That data is gone from
    // existing documents only via a migration; new writes should no longer
    // set these top-level fields at all.
    applications: { type: [applicationEntrySchema], default: [] },
  },
  { timestamps: true }
)

biddersListSchema.index({ tenderId: 1 })
biddersListSchema.index({ 'applications.userId': 1 })

module.exports = mongoose.model('BiddersList', biddersListSchema, 'bidderlists')