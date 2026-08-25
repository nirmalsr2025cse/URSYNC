// src/models/AuctionBidders.js
//
// Snapshot of a tender's FINAL, locked-in bidder list — created the
// moment finalizeBidders() (see src/controllers/finalBidderController.js)
// locks a tender by setting Tender.isFinalizedBidders = true.
//
// Source of the data: FinalBidders.applications[] entries (see
// src/models/FinalBidders.js) that currently have isBidderApproved ===
// true at finalize time. This is a COPY, field-for-field, mirroring the
// same applications[] entry shape used by BiddersList -> FinalBidders ->
// AuctionBidders all the way down, so downstream auction/department
// screens can consume it the same way as the previous two collections.
// It stays exactly as it was at finalize-time even if the source
// FinalBidders record is later edited — same "snapshot, not reference"
// contract as FinalBidders itself.
//
// One AuctionBidders document per tender, holding every approved
// applications[] entry at finalize-time. Collection name is deliberately
// "auctionbidders".

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

const auctionApplicationEntrySchema = new Schema(
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
    // Carried over as-is from FinalBidders at finalize-time. Both are
    // true for every entry that makes it into this collection (only
    // isBidderApproved === true entries are copied — see
    // finalizeBidders), but the fields are kept so this stays a faithful
    // field-for-field snapshot rather than a reshaped subset.
    isDocumentApproved: { type: Boolean, default: false },
    isBidderApproved: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false }
)

const auctionBiddersSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true, unique: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },

    applications: { type: [auctionApplicationEntrySchema], default: [] },

    // Audit fields for the "Finalize Bidders" action itself.
    finalizedAt: { type: Date, default: Date.now },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

auctionBiddersSchema.index({ tenderId: 1 })

module.exports = mongoose.model('AuctionBidders', auctionBiddersSchema, 'auctionbidders')