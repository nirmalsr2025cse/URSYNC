// src/controllers/approvedApplicantController.js
//
// Backs the ApplicantDetails.jsx page when reached via:
//   /applications/:tenderCode/approved/:applicationId
//
// `tenderCode` is the human-readable Tender.tenderCode (e.g. "TN/PWD/2026/014"),
// NOT the Mongo _id — matches the convention already used by
// applyTenderController.getApplyTenderByCode for the apply flow. Since
// BiddersList.tenderId actually stores the Tender's _id (not its code), we
// resolve tenderCode -> Tender -> _id first, then use that _id to query
// BiddersList.
//
// `applicationId` is BiddersList.applications[].applicationId (a Mongo
// ObjectId generated once in tempBidderApplicationController.saveApplication
// and carried over unchanged through submitApplication) — it uniquely
// identifies one bidder's submitted application to one tender.
//
// This does NOT do role-based field stripping server-side — it returns the
// full application record (including bidAmount/emdAmount/securityDeposit
// inside formData) and lets the frontend decide what to render based on the
// viewer's role. Restrict WHO can hit this endpoint at all at the route/
// middleware layer, the same way your other protected routes do.

const mongoose = require('mongoose')
const BiddersList = require('../models/BiddersList')
const Tender = require('../models/Tender')

// GET /api/applications/:tenderCode/approved/:applicationId
exports.getApprovedApplicant = async (req, res) => {
  try {
    const tenderCode = String(req.params.tenderCode || '').trim()
    const { applicationId } = req.params

    if (!tenderCode) {
      return res.status(400).json({ success: false, message: 'tenderCode is required.' })
    }
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: 'Invalid applicationId.' })
    }

    // tenderCode -> Tender doc. Same join pattern as
    // applyTenderController.buildJoinStages, trimmed to what this page needs.
    const tender = await Tender.findOne({ tenderCode, isDeleted: false })
      .populate('departmentId', 'name code organization')
      .populate('categoryId', 'name')
      .lean()

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' })
    }

    // BiddersList.tenderId stores the Tender's _id, not its tenderCode —
    // this is why we had to resolve the Tender doc first, above.
    const bidderDoc = await BiddersList.findOne(
      { tenderId: tender._id, 'applications.applicationId': applicationId },
      { 'applications.$': 1 }
    ).lean()

    if (!bidderDoc || !bidderDoc.applications?.length) {
      return res.status(404).json({ success: false, message: 'Applicant not found.' })
    }

    const entry = bidderDoc.applications[0]
    const formData = entry.formData || {}

    const toFileMeta = (d) => ({
      name: d.label,
      originalName: d.originalName,
      contentType: d.contentType,
      // Reuses the same authenticated streaming endpoint already built for
      // the temp/draft flow — it works for permanent bidderlists files too
      // since they reference the exact same GridFS fileIds.
      url: `/temp-applications/file/${d.fileId}`,
    })

    return res.status(200).json({
      success: true,
      data: {
        tender: {
          _id: tender._id,
          tenderCode: tender.tenderCode,
          id: tender.tenderCode,
          title: tender.title,
          department: tender.departmentId?.name || '',
          departmentCode: tender.departmentId?.code || '',
          category: tender.categoryId?.name || '',
          estimatedValue: tender.estimatedValue,
        },
        applicant: {
          applicationId: entry.applicationId,
          // Applicant Information
          applicantName: formData.applicantName || '',
          mobile: formData.mobile || '',
          email: formData.email || '',
          district: formData.district || '',
          // Company Details
          companyName: formData.companyName || '',
          companyRegNo: formData.companyRegNo || '',
          experience: formData.experienceYears || '',
          submittedDate: entry.applicationSubmissionDateTime || entry.applicationDate || null,
          // Financial fields — sensitive; frontend hides these for
          // tender_authority. Sent here regardless of role since this
          // endpoint is shared across roles; access control for WHO can
          // hit this endpoint at all still belongs at the route level.
          bidAmount: formData.bidAmount || '',
          emdAmount: formData.emdAmount || '',
          securityDeposit: formData.securityDeposit || '',
          // Status
          isPaid: entry.isPaid || false,
          approvalStatus: entry.approvalStatus || 'Pending',
          // Documents
          documents: (entry.documents || []).map(toFileMeta),
        },
      },
    })
  } catch (err) {
    console.error('getApprovedApplicant error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch applicant details', error: err.message })
  }
}