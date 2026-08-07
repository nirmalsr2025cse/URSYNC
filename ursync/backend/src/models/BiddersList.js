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

const biddersListSchema = new Schema(
  {
    // Same id that was on the TempBidderApplication entry — carried over
    // unchanged so GridFS metadata (userId, tenderId, applicationId) still
    // matches this permanent record without touching the files themselves.
    applicationId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },

    tenderId:     { type: Schema.Types.ObjectId, ref: 'Tender', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Same shape as ApplyTenderForm's `form` state.
    formData: { type: Schema.Types.Mixed, default: {} },

    documents: { type: [documentSchema], default: [] },
    signatureFileId: { type: Schema.Types.ObjectId, default: null },
    signatureContentType: { type: String, default: null },
    signatureOriginalName: { type: String, default: null },

    // Draft -> Submitted -> Paid. Submitted the moment "Next" is clicked;
    // a later payment step (if/when wired up) can update this to 'Paid'
    // and set paymentId/paidAt without touching applicationId or documents.
    status: { type: String, default: 'Submitted' },

    applicationDate: { type: String }, // yyyy-mm-dd
    applicationSubmissionDateTime: { type: Date, default: Date.now },

    // ── Payment details — optional; not required at submission time ──────
    paymentId: { type: String, default: null },
    paidAt:    { type: Date, default: null },
  },
  { timestamps: true }
)

// Guarantees a user only ever has ONE entry per tender — this is the index
// applyTenderController.listApplyTenders relies on to hide applied tenders.
biddersListSchema.index({ tenderId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('BiddersList', biddersListSchema, 'bidderlists')