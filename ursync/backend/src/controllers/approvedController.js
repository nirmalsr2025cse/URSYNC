// src/controllers/approvedController.js
//
// Backend for the Approved page (Tenders tab + Bidders tab).
// Does NOT touch CreateTender.js / Tender.js / User.js / Role.js — only
// reads from them.
//
// Wired to authMiddleware.js, which sets on every authenticated request:
//   req.user = <full User doc, roleId/departmentId populated>
//   req.role = user.roleId?.name   (plain role-name string, e.g. 'tender_authority')
//
// Only assumption left: Department / Category / District models expose a
// `name` field for populate() to pull. If the field is named differently,
// adjust the `.populate(...)` select strings only.

const CreateTender = require('../models/CreateTender')
const Tender = require('../models/Tender')
const BiddersList = require('../models/BiddersList')
const FinalBidders = require('../models/FinalBidders')
const formatCurrency = require('../utils/formatCurrency')

// Roles allowed to see the Bidders tab on the Approved page.
const ROLES_WITH_BIDDERS_TAB = ['department_head', 'tender_authority']

// Bidders-tab query rules, per role:
//   - tender_authority: isDocumentVerified === true (isFinalizedBidders not required)
//   - department_head / department_employee: isDocumentVerified === true AND
//     isFinalizedBidders === true
const BIDDERS_QUERY_BY_ROLE = {
  tender_authority: { isDocumentVerified: true },
  department_head: { isDocumentVerified: true, isFinalizedBidders: true },
}

// Which collection backs the per-bidder applicant list on the Bidders tab,
// per role:
//   - tender_authority: reads the live `bidderlists` collection (BiddersList)
//   - department_head / department_employee: reads the frozen snapshot in
//     `finalbidders` (FinalBidders), taken when the tender authority sent
//     the finalized bidders to the department.
const BIDDER_LIST_MODEL_BY_ROLE = {
  tender_authority: BiddersList,
  department_head: FinalBidders,
}

// Route prefix that serves a document's raw bytes by fileId, for
// GridFS-backed files under the `bidderDocuments` bucket (see the
// `fileId` comment on FinalBidders.js / BiddersList.js's documentSchema).
// This is the SAME bucket the pending-applicants flow's
// `/temp-applications/file/:fileId` route reads from — reused here rather
// than duplicated, since the file bytes for an approved/finalized bidder's
// documents were never copied anywhere else, only the metadata was.
//
// NOTE: adjust this constant if your actual file-serving route has a
// different path — grep your routes folder for "file/:fileId" or
// "GridFSBucket" to confirm the real prefix, then update this one line.
const BIDDER_DOCUMENT_FILE_ROUTE_PREFIX = '/temp-applications/file'

function buildFileUrl(fileId) {
  if (!fileId) return null
  return `${BIDDER_DOCUMENT_FILE_ROUTE_PREFIX}/${fileId}`
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getRoleName(req) {
  return req.role || null
}

function getUserId(req) {
  return req.user?._id || null
}

// Reshape a CreateTender doc -> the flat shape ApprovedTenderCard expects,
// PLUS the fuller field set TenderDetailsView.jsx expects (same shape as
// tenderController.js's toCardShape()), so navigating from the card's
// "View" button to /tender-details-view/:id shows every field instead of
// just the handful the card itself renders.
function mapCreateTenderToCard(doc) {
  return {
    // ── Card fields (ApprovedTenderCard) ───────────────────────────────
    recordId: doc._id,
    id: doc.tenderId,
    projectName: doc.title,
    description: doc.description,
    department: doc.departmentId?.name || '—',
    category: doc.categoryId?.name || '—',
    district: doc.districtId?.name || '—',
    tenderType: doc.tenderType,
    priority: doc.priority,
    image: doc.image,
    status: doc.status,
    startDate: doc.startDate,
    endDate: doc.closingDate,
    amount: doc.estimatedValue,
    lastUpdated: doc.updatedAt,

    // ── Detail-page fields (TenderDetailsView) ─────────────────────────
    title: doc.title,
    documentUrl: doc.documentUrl || null,
    departmentCode: doc.departmentId?.code || '',
    organization: doc.departmentId?.organization || doc.departmentId?.name || '—',
    location: doc.location || doc.districtId?.name || '',
    taluk: doc.taluk || '',
    village: doc.village || '',
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    duration: doc.duration || '',
    value: formatCurrency(doc.estimatedValue),
    estimatedValue: doc.estimatedValue,
    closingDate: doc.closingDate,
    application: doc.application,
    isCancelled: doc.isCancelled || false,
    isRetendered: doc.isRetendered || false,
    cancelledReason: doc.cancelledReason || null,
    cancelledAt: doc.cancelledAt || null,
    retenderedAt: doc.retenderedAt || null,
  }
}

// Reshape a Tender doc -> the flat shape ApprovedBidderCard expects,
// PLUS the fuller detail-page field set (see mapCreateTenderToCard above).
function mapTenderToBidderCard(doc) {
  return {
    // ── Card fields (ApprovedBidderCard) ───────────────────────────────
    recordId: doc._id,
    id: doc.tenderCode,
    projectName: doc.title,
    description: doc.description,
    department: doc.departmentId?.name || '—',
    category: doc.categoryId?.name || '—',
    district: doc.districtId?.name || '—',
    image: doc.image,
    amount: doc.estimatedValue,
    applicationDeadline: doc.applicationDeadline,
    approvedApplicationCount: doc.approvedApplicationCount,
    lastUpdated: doc.updatedAt,

    // ── Detail-page fields (TenderDetailsView) ─────────────────────────
    title: doc.title,
    documentUrl: doc.documentUrl || null,
    departmentCode: doc.departmentId?.code || '',
    organization: doc.departmentId?.organization || doc.departmentId?.name || '—',
    location: doc.location || doc.districtId?.name || '',
    taluk: doc.taluk || '',
    village: doc.village || '',
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    duration: doc.duration || '',
    value: formatCurrency(doc.estimatedValue),
    estimatedValue: doc.estimatedValue,
    startDate: doc.startDate,
    closingDate: doc.closingDate,
    status: doc.status,
    application: doc.application,
    isCancelled: doc.isCancelled || false,
    isRetendered: doc.isRetendered || false,
    cancelledReason: doc.cancelledReason || null,
    cancelledAt: doc.cancelledAt || null,
    retenderedAt: doc.retenderedAt || null,
  }
}

// Reshape one `applications[]` entry (BiddersList or FinalBidders — same
// shape) -> the flat shape ApplicationApplicants.jsx's ApplicantCard
// expects. Applicant-specific details (name, company, experience,
// district) live inside the free-form `formData` blob captured at apply
// time, so we read them out with a few reasonable key fallbacks.
function mapApplicationEntryToApplicantCard(entry) {
  const fd = entry.formData || {}
  return {
    applicationId: entry.applicationId,
    userId: entry.userId,
    applicantName: fd.applicantName || fd.fullName || fd.name || '—',
    companyName: fd.companyName || fd.organizationName || fd.firmName || '—',
    experience: fd.experience || fd.yearsOfExperience || '—',
    district: fd.district || fd.applicantDistrict || '—',
    submittedDate: entry.applicationSubmissionDateTime || entry.applicationTime || entry.createdAt,
    documents: entry.documents || [],
    isPaid: entry.isPaid || false,
    isDocumentApproved: entry.isDocumentApproved || false,
    isBidderApproved: entry.isBidderApproved || false,
    // FIX: this was previously missing, so ApplicationApplicants.jsx's
    // own fallback (applicant.formData?.experience ||
    // applicant.formData?.yearsOfExperience) had nothing to read —
    // `formData` never reached the client at all, which is why
    // Experience always rendered as "—" on the read-only Bidders-tab
    // view even when fd.experience/fd.yearsOfExperience didn't match
    // this tender's actual dynamic field name. Included here so that
    // fallback can do its job, same as applicationApplicantsController.js's
    // formatApplicant() already does.
    formData: fd,
  }
}

// Reshape one `applications[]` entry -> the fuller shape
// ApplicantDetails.jsx expects (formData object as-is, documents/signature
// with a fetchable `url`, so Preview/Download work the same way they do
// on the pending-applicants flow).
function mapApplicationEntryToApplicantDetail(entry) {
  const documents = (entry.documents || []).map((doc) => ({
    fileId: doc.fileId,
    label: doc.label,
    originalName: doc.originalName,
    contentType: doc.contentType,
    size: doc.size,
    url: buildFileUrl(doc.fileId),
  }))

  const signature = entry.signatureFileId
    ? {
        fileId: entry.signatureFileId,
        originalName: entry.signatureOriginalName,
        contentType: entry.signatureContentType,
        url: buildFileUrl(entry.signatureFileId),
      }
    : null

  return {
    applicationId: entry.applicationId,
    userId: entry.userId,
    formData: entry.formData || {},
    documents,
    signature,
    isPaid: entry.isPaid || false,
    isDocumentApproved: entry.isDocumentApproved || false,
    isBidderApproved: entry.isBidderApproved || false,
  }
}

// Reshape the populated tender on a BiddersList/FinalBidders doc -> the
// small header shape ApplicationApplicants.jsx renders at the top of the
// page (tender.id, tender.title, tender.department, tender.district,
// tender.currency, tender.value).
function mapTenderToApplicantsHeader(doc) {
  return {
    id: doc.tenderCode,
    title: doc.title,
    department: doc.departmentId?.name || '—',
    district: doc.districtId?.name || '—',
    currency: '₹',
    value: doc.estimatedValue,
  }
}

// ── GET /api/approvement/tabs ────────────────────────────────────────────
// Role-driven tab list — the frontend renders whatever this returns instead
// of deciding locally which roles get the Bidders tab.
exports.getApprovedTabs = async (req, res) => {
  try {
    const roleName = getRoleName(req)
    if (!roleName) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const tabs = [{ id: 'tenders', label: 'Tenders' }]
    if (ROLES_WITH_BIDDERS_TAB.includes(roleName)) {
      tabs.push({ id: 'bidders', label: 'Bidders' })
    }

    return res.json({ success: true, data: tabs })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── GET /api/approvement/tenders/approved ────────────────────────────────
// Tenders (from createtenders collection) that the current user has
// approved at some stage — status 'Approved' and present in approvalChain.
exports.getApprovedTenders = async (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const docs = await CreateTender.find({
      status: 'Approved',
      isDeleted: false,
      'approvalChain.userId': userId,
    })
      .populate('departmentId', 'name code organization')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .sort({ updatedAt: -1 })
      .lean()

    return res.json({ success: true, data: docs.map(mapCreateTenderToCard) })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── GET /api/approvement/bidders/approved ────────────────────────────────
// Tenders (from tenders collection), filtered by role:
//   - tender_authority: isDocumentVerified === true
//   - department_head / department_employee: isDocumentVerified === true
//     AND isFinalizedBidders === true
// Any other role is forbidden.
exports.getApprovedBidders = async (req, res) => {
  try {
    const roleName = getRoleName(req) // req.role, set by authMiddleware from user.roleId.name

    const roleQuery = BIDDERS_QUERY_BY_ROLE[roleName]
    if (!roleQuery) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: tender_authority, department_head, or department_employee only',
      })
    }

    const docs = await Tender.find({
      ...roleQuery,
      isDeleted: false,
    })
      .populate('departmentId', 'name code organization')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .sort({ updatedAt: -1 })
      .lean()

    return res.json({ success: true, data: docs.map(mapTenderToBidderCard) })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── GET /api/approvement/bidders/:tenderCode/applicants ──────────────────
// Read-only applicant list for a single tender's Bidders-tab card, opened
// from the "View" button on the Approved page. :tenderCode is the Tender
// document's tenderCode (e.g. "TN/PWD/2026/001") — matches how the normal
// pending-applicants flow already encodes tenderCode in the URL, so both
// flows are consistent. Resolved to the Tender's Mongo _id first, since
// that's what BiddersList/FinalBidders.tenderId actually references.
//   - tender_authority         -> reads `bidderlists` (BiddersList, live)
//   - department_head/employee -> reads `finalbidders` (FinalBidders, the
//                                  frozen snapshot sent to the department)
// No approve/reject here — this is display-only, so unlike
// tempBidderApplicationController's applicant list this never mutates
// isDocumentApproved/isBidderApproved.
exports.getApprovedBidderApplicants = async (req, res) => {
  try {
    const roleName = getRoleName(req)
    const tenderCode = req.params.tenderId // route param name kept as :tenderId, value is the tenderCode

    const Model = BIDDER_LIST_MODEL_BY_ROLE[roleName]
    if (!Model) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: tender_authority, department_head, or department_employee only',
      })
    }

    const tenderDoc = await Tender.findOne({ tenderCode, isDeleted: false })
      .populate('departmentId', 'name code organization')
      .populate('districtId', 'name')
      .lean()

    if (!tenderDoc) {
      return res.json({ success: true, data: { tender: null, applicants: [] } })
    }

    // Use the tenderCode-resolved Tender._id to find this tender's own
    // bidder-list/final-bidders doc. `tenderId` isn't a unique index on
    // BiddersList/FinalBidders, so if duplicates ever exist for the same
    // tender, take the most recently updated one rather than whichever
    // happens to sort first in Mongo's natural order — that's what was
    // causing an unrelated/older tender's bidders to show up here.
    const list = await Model.findOne({ tenderId: tenderDoc._id })
      .sort({ updatedAt: -1 })
      .lean()

    if (!list) {
      // Tender exists but has no bidder-list/final-bidders doc yet —
      // still return the tender header so the page can show "No
      // finalized bidders." instead of a generic not-found error.
      return res.json({
        success: true,
        data: { tender: mapTenderToApplicantsHeader(tenderDoc), applicants: [] },
      })
    }

    const applicants = (list.applications || []).map(mapApplicationEntryToApplicantCard)

    return res.json({
      success: true,
      data: {
        tender: mapTenderToApplicantsHeader(tenderDoc),
        applicants,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ── GET /api/approvement/bidders/:tenderId/applicants/:applicationId ─────
// Read-only SINGLE-applicant detail (formData + documents + signature,
// each document/signature carrying a fetchable `url`), for the Approved
// page's Bidders-tab "View" button — the ApplicantDetails.jsx page hits
// this instead of the pending-applicants detail endpoint when it's
// opened in read-only mode. Same role → collection mapping as the list
// endpoint above, so a department_head sees the finalbidders snapshot's
// documents (which it never could before — that's the whole fix).
exports.getApprovedBidderApplicantDetail = async (req, res) => {
  try {
    const roleName = getRoleName(req)
    const tenderCode = req.params.tenderId
    const { applicationId } = req.params

    const Model = BIDDER_LIST_MODEL_BY_ROLE[roleName]
    if (!Model) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: tender_authority, department_head, or department_employee only',
      })
    }

    const tenderDoc = await Tender.findOne({ tenderCode, isDeleted: false })
      .populate('departmentId', 'name code organization')
      .populate('districtId', 'name')
      .lean()

    if (!tenderDoc) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const list = await Model.findOne({ tenderId: tenderDoc._id })
      .sort({ updatedAt: -1 })
      .lean()

    const entry = (list?.applications || []).find(
      (a) => String(a.applicationId) === String(applicationId)
    )

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Applicant not found' })
    }

    return res.json({
      success: true,
      data: {
        tender: mapTenderToApplicantsHeader(tenderDoc),
        applicant: mapApplicationEntryToApplicantDetail(entry),
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}