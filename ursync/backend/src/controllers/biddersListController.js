// src/controllers/biddersListController.js
//
// Serves the "Applicants" page (ApplicationApplicants.jsx) and the
// "Applicant Details" page (ApplicantDetails.jsx). Reads from the
// `bidderlists` collection (BiddersList model), which holds ONE document
// per tender, with every submitted application as an entry in its
// `applications[]` array.
//
// The frontend identifies tenders by tenderCode (e.g. "TN/PWD/2026/014"),
// not by Mongo _id — that's what's in the URL when the user clicks
// "View Applications" on the Applications page. So this controller first
// resolves tenderCode -> Tender._id, then looks up BiddersList by that id.
//
// File preview/download: documents and the signature are stored in GridFS
// (bidderDocuments.files) — the SAME bucket tempBidderApplicationController
// already streams from via GET /temp-applications/file/:fileId (see
// tempBidderApplicationController.getFile). Since submitApplication()
// carries the exact same fileId over into bidderlists rather than
// re-uploading, that same streaming endpoint works unchanged here — this
// controller just needs to hand the frontend the right fileId-based URL
// for each document, which is what toFileUrl() below does.

const Tender = require('../models/Tender')
const BiddersList = require('../models/BiddersList')

// Fields that must never be shown on the Applicant Details page, per
// requirement — hidden here at the response level (not just in the UI) so
// they can't leak through if the frontend is ever changed carelessly.
const HIDDEN_FORM_FIELDS = ['bidAmount', 'emdAmount', 'securityDeposit']

// Same base path tempBidderApplicationController.getApplication() already
// uses for its document URLs — no leading "/api", since the frontend's
// apiFetch/BASE_URL already includes that prefix.
function toFileUrl(fileId) {
  return fileId ? `/temp-applications/file/${fileId}` : null
}

// Shapes one applications[] entry into what ApplicantCard /
// ApplicationApplicants.jsx expect for the LIST view: applicantName,
// companyName, applicationId, experience, district, submittedDate,
// documents. All of this comes out of formData, which is free-form
// (Schema.Types.Mixed) — so every read here is defensively
// optional-chained/defaulted rather than assumed present.
function formatApplicant(entry) {
  const formData = entry.formData || {}
  return {
    applicationId: entry.applicationId?.toString(),
    userId: entry.userId?.toString(),
    applicantName: formData.applicantName || 'Unnamed Applicant',
    companyName: formData.companyName || '—',
    experience: formData.experienceYears ? `${formData.experienceYears} yrs` : 'Not specified',
    district: formData.district || '—',
    submittedDate: entry.applicationSubmissionDateTime || entry.applicationDate || entry.createdAt,
    documents: (entry.documents || []).map((d) => ({
      label: d.label,
      fileId: d.fileId?.toString(),
      originalName: d.originalName,
      contentType: d.contentType,
      size: d.size,
    })),
    isPaid: entry.isPaid || false,
    paidAt: entry.paidAt || null,
  }
}

// Shapes one applications[] entry for the DETAIL view: the full formData
// (minus HIDDEN_FORM_FIELDS), every document with a working preview/
// download URL, and the signature with its own URL if present.
function formatApplicantDetail(entry) {
  const formData = { ...(entry.formData || {}) }
  HIDDEN_FORM_FIELDS.forEach((field) => delete formData[field])

  return {
    applicationId: entry.applicationId?.toString(),
    userId: entry.userId?.toString(),
    formData,
    documents: (entry.documents || []).map((d) => ({
      label: d.label,
      fileId: d.fileId?.toString(),
      originalName: d.originalName,
      contentType: d.contentType,
      size: d.size,
      url: toFileUrl(d.fileId),
    })),
    signature: entry.signatureFileId
      ? {
          fileId: entry.signatureFileId.toString(),
          originalName: entry.signatureOriginalName || null,
          contentType: entry.signatureContentType || null,
          url: toFileUrl(entry.signatureFileId),
        }
      : null,
    isPaid: entry.isPaid || false,
    paymentId: entry.paymentId || null,
    paidAt: entry.paidAt || null,
    applicationDate: entry.applicationDate || null,
    applicationSubmissionDateTime: entry.applicationSubmissionDateTime || null,
  }
}

// ── GET /api/tenders/applications/applicants?tenderCode=TN/PWD/2026/014 ────
// Returns the tender's own summary info (for the header card) plus the
// full list of applicants for that tender, pulled from bidderlists.
exports.getApplicantsForTender = async (req, res) => {
  try {
    const { tenderCode } = req.query

    if (!tenderCode || !tenderCode.trim()) {
      return res.status(400).json({ success: false, message: 'tenderCode is required' })
    }

    const tender = await Tender.findOne({ tenderCode: tenderCode.trim(), isDeleted: false })
      .populate('departmentId', 'name code')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .lean()

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const biddersList = await BiddersList.findOne({ tenderId: tender._id }).lean()

    const applicants = biddersList
      ? biddersList.applications.map(formatApplicant)
      : []

    return res.status(200).json({
      success: true,
      count: applicants.length,
      data: {
        tender: {
          id: tender.tenderCode,
          title: tender.title,
          department: tender.departmentId?.name || '—',
          district: tender.districtId?.name || '—',
          category: tender.categoryId?.name || '—',
          value: tender.estimatedValue,
          currency: tender.currency || 'INR',
        },
        applicants,
      },
    })
  } catch (err) {
    console.error('getApplicantsForTender error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/tenders/applications/applicants/:applicationId ────────────────
// Single applicant's full detail (used by the "View" button ->
// ApplicantDetails page). Searches across all BiddersList documents for
// the matching applications[] entry, since applicationId alone doesn't
// tell you which tender it belongs to. Returns full formData (minus the
// three hidden fields) plus working file URLs for every document and the
// signature.
exports.getApplicantById = async (req, res) => {
  try {
    const { applicationId } = req.params

    const biddersList = await BiddersList.findOne({
      'applications.applicationId': applicationId,
    })
      .populate({
        path: 'tenderId',
        select: 'tenderCode title departmentId estimatedValue currency',
        populate: { path: 'departmentId', select: 'name' },
      })
      .lean()

    if (!biddersList) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }

    const entry = biddersList.applications.find(
      (a) => a.applicationId?.toString() === applicationId
    )

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }

    return res.status(200).json({
      success: true,
      data: {
        tender: {
          id: biddersList.tenderId?.tenderCode || null,
          title: biddersList.tenderId?.title || null,
          department: biddersList.tenderId?.departmentId?.name || '—',
          value: biddersList.tenderId?.estimatedValue ?? null,
          currency: biddersList.tenderId?.currency || 'INR',
        },
        applicant: formatApplicantDetail(entry),
      },
    })
  } catch (err) {
    console.error('getApplicantById error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}