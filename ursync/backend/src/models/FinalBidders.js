// src/models/FinalBidders.js
//
// Snapshot of a tender's finalized/approved bidders, created the moment
// the Tender Authority clicks "Send to Department" on the Approved
// Applicants screen. Mirrors the shape of a BiddersList `applications[]`
// entry field-for-field (see src/models/BiddersList.js) — this is a copy,
// not a reference, so it stays exactly as it was at send-time even if the
// source BiddersList record is later edited or an applicant is somehow
// un-approved.
//
// One FinalBidders document per tender, holding all of that tender's
// approved applications[] entries at send-time — same shape as
// BiddersList so downstream department screens can consume it the same
// way. Collection name is deliberately "finalbidders".

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

const finalApplicationEntrySchema = new Schema(
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
    isDocumentApproved: { type: Boolean, default: false },
    isBidderApproved: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false }
)

const finalBiddersSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true, unique: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },

    applications: { type: [finalApplicationEntrySchema], default: [] },

    // Audit fields for the "Send to Department" action itself.
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

finalBiddersSchema.index({ tenderId: 1 })

module.exports = mongoose.model('FinalBidders', finalBiddersSchema, 'finalbidders')