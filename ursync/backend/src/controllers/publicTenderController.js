// src/controllers/publicTender.controller.js
//
// Public, role-agnostic read access to published tenders — sourced from the
// live `tenders` collection (Tender model), NOT `createtenders`. Every
// document here only exists because a Tender Authority already approved it
// (see createTenderApprovalController.tenderAuthorityApprove), so there's
// no separate "Approved" status filter needed on this collection — every
// non-deleted, non-cancelled document IS the approved list. No auth/role
// check is applied on purpose: this powers pages like Completed.jsx that
// any logged-in user (regardless of role) should be able to view.

const Tender = require('../models/Tender')

function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return null
  const num = Number(amount)
  if (Number.isNaN(num)) return null
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `₹ ${num}`
  }
}

// Shapes a Tender doc into the fields TenderCard.jsx / Completed.jsx expect.
function toCardShape(doc) {
  return {
    id: doc.tenderCode || doc._id.toString(),
    _id: doc._id.toString(),
    tenderCode: doc.tenderCode,

    title: doc.title,
    projectName: doc.title,
    description: doc.description || '',
    image: doc.image || '',
    documentUrl: doc.documentUrl || null,

    department: doc.departmentId?.name || '',
    departmentCode: doc.departmentId?.code || '',
    organization: doc.departmentId?.organization || doc.departmentId?.name || '',

    category: doc.categoryId?.name || '',
    location: doc.location || (doc.districtId?.name || ''),
    taluk: doc.taluk || '',
    village: doc.village || '',
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    duration: doc.duration || '',

    estimatedValue: doc.estimatedValue,
    currency: doc.currency,
    value: formatCurrency(doc.estimatedValue, doc.currency) || '—',

    startDate: doc.startDate || null,
    closingDate: doc.closingDate || null,
    applicationStartDate: doc.applicationStartDate || null,
    applicationEndDate: doc.applicationEndDate || null,
    applicationDeadline: doc.applicationDeadline || null,

    status: doc.status,
    application: doc.application,

    isCancelled: doc.isCancelled || false,
    cancelledReason: doc.cancelledReason || null,
    cancelledAt: doc.cancelledAt || null,
    isRetendered: doc.isRetendered || false,
    retenderedAt: doc.retenderedAt || null,
  }
}

function populateOpts() {
  return [
    { path: 'departmentId', select: 'name code organization' },
    { path: 'categoryId', select: 'name' },
    { path: 'districtId', select: 'name' },
  ]
}

// ── GET /api/public-tenders ────────────────────────────────────────────
// Returns every non-deleted, non-cancelled tender in the live `tenders`
// collection. No role filtering — every doc here was already approved by
// construction.
exports.getAllPublishedTenders = async (req, res) => {
  try {
    const tenders = await Tender.find({ isDeleted: false, isCancelled: false })
      .populate(populateOpts())
      .sort({ createdAt: -1 })
      .lean()

    const data = tenders.map(toCardShape)

    return res.status(200).json({ success: true, count: data.length, data })
  } catch (err) {
    console.error('getAllPublishedTenders error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch tenders', error: err.message })
  }
}

// ── GET /api/public-tenders/:id ───────────────────────────────────────
// Fetch a single published tender by its Mongo _id or its tenderCode.
exports.getPublishedTenderById = async (req, res) => {
  try {
    const { id } = req.params

    const query = { isDeleted: false, $or: [{ tenderCode: id }] }
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id })
    }

    const tender = await Tender.findOne(query).populate(populateOpts())

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    return res.status(200).json({ success: true, data: toCardShape(tender) })
  } catch (err) {
    console.error('getPublishedTenderById error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch tender', error: err.message })
  }
}