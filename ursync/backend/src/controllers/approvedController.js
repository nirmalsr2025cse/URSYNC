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
const formatCurrency = require('../utils/formatCurrency')

// Roles allowed to see the Bidders tab on the Approved page.
const ROLES_WITH_BIDDERS_TAB = ['department_employee', 'department_head', 'tender_authority']

// ── Helpers ────────────────────────────────────────────────────────────────

function getRoleName(req) {
  return req.role || null
}

function getUserId(req) {
  return req.user?._id || null
}

// Bidders-tab query rule, by role:
//   - tender_authority       -> isDocumentVerified === true
//                                (isFinalizedBidders not required)
//   - any other allowed role -> isDocumentVerified === true AND
//     (department_head / department_employee)   isFinalizedBidders === true
// Returns null if the role isn't allowed on the Bidders tab at all.
function getBiddersQueryForRole(roleName) {
  if (!ROLES_WITH_BIDDERS_TAB.includes(roleName)) {
    return null
  }
  if (roleName === 'tender_authority') {
    return { isDocumentVerified: true }
  }
  return { isDocumentVerified: true, isFinalizedBidders: true }
}

// Reshape a CreateTender doc -> the flat shape ApprovedTenderCard expects,
// PLUS the fuller field set TenderDetailsView.jsx expects (same shape as
// tenderController.js's toCardShape()), so navigating from the card's
// "View" button to /tender-details-view/:id shows every field instead of
// just the handful the card itself renders.
//
// Every field below maps to an actual field on the CreateTender schema
// (src/models/CreateTender.js) — no fields borrowed from Tender.js.
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
  }
}

// Reshape a Tender doc -> the flat shape ApprovedBidderCard expects.
//
// Bidders-tab cards are card-only — there's no "View tender details"
// navigation for this tab (unlike the Tenders tab), so no detail-page
// fields (title/documentUrl/departmentCode/organization/location/etc.)
// are included here at all.
function mapTenderToBidderCard(doc) {
  return {
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
    status: doc.status,
    isDocumentVerified: doc.isDocumentVerified || false,
    isFinalizedBidders: doc.isFinalizedBidders || false,
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
      .populate('departmentId', 'name code')
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
// Tenders (from `tenders` collection, Tender.js), filtered by role:
//   - tender_authority                      -> isDocumentVerified === true
//   - department_head / department_employee -> isDocumentVerified === true
//                                                AND isFinalizedBidders === true
// Any other role is forbidden. Card-only response — no detail-page fields,
// no "View" navigation for this tab.
exports.getApprovedBidders = async (req, res) => {
  try {
    const roleName = getRoleName(req) // req.role, set by authMiddleware from user.roleId.name

    const roleQuery = getBiddersQueryForRole(roleName)
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
      .populate('departmentId', 'name')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .sort({ updatedAt: -1 })
      .lean()

    return res.json({ success: true, data: docs.map(mapTenderToBidderCard) })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}