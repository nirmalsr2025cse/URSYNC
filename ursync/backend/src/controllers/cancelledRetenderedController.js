// src/controllers/cancelledRetenderedController.js
// Backs CancelledRetendered.jsx.
//
// Schema notes (Tender.js):
//   - isCancelled:true  -> status is FROZEN at whatever it was the moment
//     of cancellation. We surface `status` as-is for display but the real
//     signal for "why" is `cancelledReason`.
//   - isRetendered:true -> status is a REAL, live value (Ongoing/Upcoming),
//     never Completed (enforced in the pre-save hook) — so this is safe
//     to show as the actual current status of the retender cycle.
//
// Role visibility (mirrors the old client-side logic in CancelledRetendered.jsx):
//   - department_employee / department_head -> only their own department's tenders
//   - tender_person                          -> only cancelled tenders THEY cancelled
//   - everyone else (admin, financial, tender_authority, public)
//                                             -> everything

const mongoose = require('mongoose')
const Tender = require('../models/Tender')
const formatCurrency = require('../utils/formatCurrency')

const DEPT_RESTRICTED_ROLES = ['department_employee', 'department_head']

function buildBaseStages(req, tab) {
  const stages = [
    { $match: { isDeleted: false, ...(tab === 'cancelled' ? { isCancelled: true } : { isRetendered: true }) } },
    {
      $lookup: {
        from: 'departments',
        localField: 'departmentId',
        foreignField: '_id',
        as: 'departmentDoc',
      },
    },
    { $unwind: '$departmentDoc' },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    { $unwind: '$categoryDoc' },
    {
      $lookup: {
        from: 'districts',
        localField: 'districtId',
        foreignField: '_id',
        as: 'districtDoc',
      },
    },
    { $unwind: { path: '$districtDoc', preserveNullAndEmptyArrays: true } },
  ]

  const role = req.user?.role

  // Department-scoped roles only see their own department's tenders —
  // same rule used across every other tenders listing endpoint.
  if (DEPT_RESTRICTED_ROLES.includes(role) && req.departmentCode) {
    stages.push({ $match: { 'departmentDoc.code': req.departmentCode } })
  }

  // A tender_person only ever sees cancelled tenders THEY personally
  // cancelled — never other people's, and never the retendered tab
  // (that's filtered out at the route level too, see controller below).
  if (role === 'tender_person' && req.user?.id) {
    stages.push({ $match: { cancelledBy: new mongoose.Types.ObjectId(req.user.id) } })
  }

  return stages
}

function toCardShape(t, tab) {
  return {
    id: t.tenderCode,
    tenderCode: t.tenderCode,
    title: t.title,
    description: t.description,
    image: t.image,
    documentUrl: t.documentUrl || null,

    department: t.departmentDoc.name,
    departmentCode: t.departmentDoc.code,
    organization: t.departmentDoc.organization || t.departmentDoc.name,

    category: t.categoryDoc.name,
    location: t.location || (t.districtDoc ? t.districtDoc.name : ''),

    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,

    // The date shown on the card reflects whichever event this tab is about.
    closingDate: tab === 'cancelled' ? t.cancelledAt : t.retenderedAt,

    // Cancelled tab: status is frozen (per schema) — shown as-is, but the
    // reason is the meaningful signal, surfaced separately for the UI.
    // Retendered tab: status is real/live (Ongoing/Upcoming/Completed-never).
    status: t.status,

    cancelledReason: t.cancelledReason || null,
    cancelledAt: t.cancelledAt || null,
    retenderedAt: t.retenderedAt || null,
    originalTenderId: t.originalTenderId || null,
  }
}

/**
 * GET /api/tenders/cancelled-retendered
 * Query params:
 *   tab      - "cancelled" | "retendered" (required)
 *   search   - matches Tender ID or organisation name
 *   page, limit
 */
async function getCancelledRetenderedTenders(req, res) {
  try {
    const tab = String(req.query.tab || '').trim()
    if (!['cancelled', 'retendered'].includes(tab)) {
      return res.status(400).json({ message: 'tab must be "cancelled" or "retendered"' })
    }

    // tender_person role never sees the retendered tab at all.
    if (tab === 'retendered' && req.user?.role === 'tender_person') {
      return res.json({ tenders: [], totalCount: 0, totalPages: 1, currentPage: 1 })
    }

    const search = String(req.query.search || '').trim()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    const stages = buildBaseStages(req, tab)

    if (search) {
      const regex = { $regex: search, $options: 'i' }
      stages.push({
        $match: {
          $or: [
            { tenderCode: regex },
            { 'departmentDoc.organization': regex },
            { 'departmentDoc.name': regex },
          ],
        },
      })
    }

    stages.push({
      $sort: tab === 'cancelled' ? { cancelledAt: -1 } : { retenderedAt: -1 },
    })

    stages.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    })

    const [result] = await Tender.aggregate(stages)
    const items = (result?.data || []).map((t) => toCardShape(t, tab))
    const totalCount = result?.totalCount?.[0]?.count || 0

    return res.json({
      tenders: items,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    })
  } catch (err) {
    console.error('getCancelledRetenderedTenders error:', err)
    return res.status(500).json({ message: 'Failed to fetch cancelled/retendered tenders' })
  }
}

module.exports = { getCancelledRetenderedTenders }