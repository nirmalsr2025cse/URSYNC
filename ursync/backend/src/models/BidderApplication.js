// src/models/BidderApplication.js
//
// One document per applicant who applied to a tender. Feeds the
// FinalBidder page (src/pages/FinalBidder.jsx):
//   - "View" (Bidders tab)             -> all applications for the tender
//   - "Finalize Bidders" (Bidders tab) -> only isBidderApproved === false
//
// tenderCode is denormalized (copied from Tender.tenderCode at
// application time) so the FinalBidder page can be looked up directly by
// the human-readable code from the URL, matching how the Approvement
// Bidders tab already exposes `id: t.tenderCode` — see
// formatBidderFinalizationTender() in approvementController.js.
//
// NOTE: If bidder applications already live in a different collection in
// this codebase, point the controller below at that model/fields instead
// of this one — this schema is a best-guess based on the fields
// finalBidderMockData.js was already using on the frontend.

const mongoose = require('mongoose')
const { Schema } = mongoose

const bidderApplicationSchema = new Schema(
  {
    tenderId: { type: Schema.Types.ObjectId, ref: 'Tender', required: true, index: true },
    tenderCode: { type: String, required: true, index: true }, // e.g. "TN/PWD/2026/001"
    tenderTitle: { type: String, default: '' },

    applicationId: { type: String, required: true, unique: true }, // human-facing code
    applicantName: { type: String, required: true },
    companyName: { type: String, default: '' },

    bidAmount: { type: Number, default: 0 },
    experience: { type: String, default: '' }, // e.g. "8 years"
    district: { type: String, default: '' },

    documents: [{ type: String }], // document URLs/names
    submittedDate: { type: Date, default: Date.now },

    status: { type: String, default: 'Submitted' }, // display label only

    // Flips to true when department_head/administrator approves this
    // bidder from the "Finalize Bidders" flow. Once true, it drops out of
    // the finalize-mode list (see getBidderApplications ?onlyPending=true).
    isBidderApproved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = mongoose.model('BidderApplication', bidderApplicationSchema)