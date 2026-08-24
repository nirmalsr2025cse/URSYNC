// src/controllers/applicationApplicantsController.js
//
// Serves the "Applicants" screens for a single tender. Source of truth for
// "has this bidder been approved" is the isDocumentApproved flag on the
// applications[] entry inside BiddersList (see src/models/BiddersList.js).
// approve() flips it true, reject() flips it back false — nothing else
// about the record changes, and the record is never deleted either way.
//
//   GET   /api/tenders/applications/applicants?tenderCode=...&approved=false
//   GET   /api/tenders/applications/applicants/:applicationId
//   PATCH /api/tenders/applications/applicants/:applicationId/approve
//   PATCH /api/tenders/applications/applicants/:applicationId/reject

const Tender = require('../models/Tender')
const BiddersList = require('../models/BiddersList')

function formatTenderSummary(t) {
  return {
    id: t.tenderCode,
    _id: t._id.toString(),
    title: t.title,
    department: t.departmentId?.name || '—',
    district: t.districtId?.name || '—',
    value: t.estimatedValue,
    currency: t.currency || 'INR',
  }
}

// NOTE: applicantName/companyName/experience/district aren't top-level
// fields on the applications[] entry — they live inside formData because
// the apply form is dynamic per tender. Adjust the fd.* keys below to match
// whatever field names ApplyTenderForm.jsx actually submits.
function formatApplicant(entry) {
  const fd = entry.formData || {}
  return {
    applicationId: entry.applicationId.toString(),
    userId: entry.userId?.toString ? entry.userId.toString() : entry.userId,
    applicantName: fd.applicantName || fd.name || '—',
    companyName: fd.companyName || fd.firmName || '—',
    experience: fd.experience || '—',
    district: fd.district || '—',
    submittedDate: entry.applicationSubmissionDateTime,
    isPaid: entry.isPaid,
    isDocumentApproved: entry.isDocumentApproved,
    isBidderApproved: entry.isBidderApproved,
    documents: (entry.documents || []).map((d) => ({
      fileId: d.fileId.toString(),
      label: d.label,
      originalName: d.originalName,
      contentType: d.contentType,
      size: d.size,
      url: `/temp-applications/file/${d.fileId}`,
    })),
    signature: entry.signatureFileId
      ? {
          fileId: entry.signatureFileId.toString(),
          contentType: entry.signatureContentType,
          originalName: entry.signatureOriginalName,
          url: `/temp-applications/file/${entry.signatureFileId}`,
        }
      : null,
    formData: fd,
  }
}

// ── GET /api/tenders/applications/applicants?tenderCode=...&approved=false ─
// approved: 'false' (default) -> pending list (isDocumentApproved !== true)
//           'true'            -> approved list
//           'all'             -> everything
exports.getApplicants = async (req, res) => {
  try {
    const { tenderCode } = req.query
    const approvedParam = (req.query.approved || 'false').toLowerCase()

    if (!tenderCode) {
      return res.status(400).json({ success: false, message: 'tenderCode is required' })
    }

    const tender = await Tender.findOne({ tenderCode, isDeleted: false })
      .populate('departmentId', 'name')
      .populate('districtId', 'name')
      .lean()

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const biddersList = await BiddersList.findOne({ tenderId: tender._id }).lean()
    const allApplications = biddersList?.applications || []

    let filtered
    if (approvedParam === 'true') {
      filtered = allApplications.filter((a) => a.isDocumentApproved === true)
    } else if (approvedParam === 'all') {
      filtered = allApplications
    } else {
      filtered = allApplications.filter((a) => a.isDocumentApproved !== true)
    }

    return res.status(200).json({
      success: true,
      data: {
        tender: formatTenderSummary(tender),
        applicants: filtered.map(formatApplicant),
      },
    })
  } catch (err) {
    console.error('getApplicants error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/tenders/applications/applicants/:applicationId ────────────────
exports.getApplicantDetails = async (req, res) => {
  try {
    const { applicationId } = req.params

    const biddersList = await BiddersList.findOne({
      'applications.applicationId': applicationId,
    }).lean()

    if (!biddersList) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }

    const entry = biddersList.applications.find(
      (a) => a.applicationId.toString() === applicationId
    )
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }

    const tender = await Tender.findById(biddersList.tenderId)
      .populate('departmentId', 'name')
      .populate('districtId', 'name')
      .lean()

    return res.status(200).json({
      success: true,
      data: {
        tender: formatTenderSummary(tender),
        applicant: formatApplicant(entry),
      },
    })
  } catch (err) {
    console.error('getApplicantDetails error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// Shared updater — approve/reject both just flip isDocumentApproved on the
// matching applications[] entry using Mongo's positional $ operator.
async function setDocumentApproved(applicationId, value) {
  return BiddersList.findOneAndUpdate(
    { 'applications.applicationId': applicationId },
    { $set: { 'applications.$.isDocumentApproved': value } },
    { returnDocument: 'after' }
  ).lean()
}

// ── PATCH /api/tenders/applications/applicants/:applicationId/approve ──────
exports.approveApplicant = async (req, res) => {
  try {
    const updated = await setDocumentApproved(req.params.applicationId, true)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }
    return res.status(200).json({ success: true, message: 'Applicant approved' })
  } catch (err) {
    console.error('approveApplicant error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/tenders/applications/applicants/:applicationId/reject ───────
// "Reject" = send the applicant back to the pending list (un-approve their
// documents). It never deletes the application record.
exports.rejectApplicant = async (req, res) => {
  try {
    const updated = await setDocumentApproved(req.params.applicationId, false)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }
    return res.status(200).json({ success: true, message: 'Applicant moved back to pending' })
  } catch (err) {
    console.error('rejectApplicant error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}