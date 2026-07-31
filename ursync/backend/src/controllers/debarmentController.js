// src/controllers/debarmentController.js
// Backs DebarmentList.jsx — 3 tabs: Individual, Organisation, Search.
//
// Table shapes:
//   Individual tab    -> Bidder Name, PAN Number, Login ID, Product Category, Start Date, End Date
//   Organisation tab  -> Bidder Name, Login ID, Organisation Chain, Start Date, End Date
//   Search tab        -> unified: Bidder Name, PAN Number, Login ID, Organisation Chain,
//                         Product Category, Start Date, End Date
//
// Search is Login-ID-only (email) and searches across BOTH account types —
// there is no PAN search anymore. dateCriteria + fromDate + toDate are
// REQUIRED; everything else (searchId/organisation/productCategory) is optional.

const Debarment = require('../models/Debarment')

const DATE_CRITERIA_FIELD = {
  debarment_date: 'startDate',
  expiry_date: 'endDate',
}

// Formats a Date as "22-Mar-2025" to match the original mock table's style.
function safeFormatDate(d) {
  if (!d) return null
  return new Date(d)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ /g, '-')
}

function buildBaseStages() {
  return [
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userDoc',
      },
    },
    { $unwind: '$userDoc' },
  ]
}

// Shape used by the Organisation tab table.
function toOrganisationRow(d) {
  return {
    id: d.debarmentCode,
    bidderName: d.userDoc.fullName,
    loginId: d.userDoc.email,
    organizationChain: d.organizationChain || '',
    startDate: safeFormatDate(d.startDate),
    endDate: safeFormatDate(d.endDate),
  }
}

// Shape used by the Individual tab table.
function toIndividualRow(d) {
  return {
    id: d.debarmentCode,
    bidderName: d.userDoc.fullName,
    panNumber: d.userDoc.panNumber || '',
    loginId: d.userDoc.email,
    productCategory: d.productCategory || '',
    startDate: safeFormatDate(d.startDate),
    endDate: safeFormatDate(d.endDate),
  }
}

// Unified shape used by the Search tab table (works for either account type).
function toSearchRow(d) {
  return {
    id: d.debarmentCode,
    bidderName: d.userDoc.fullName,
    panNumber: d.accountType === 'Individual' ? (d.userDoc.panNumber || '') : '',
    loginId: d.userDoc.email,
    organizationChain: d.accountType === 'Organization' ? (d.organizationChain || '') : '',
    productCategory: d.accountType === 'Individual' ? (d.productCategory || '') : '',
    startDate: safeFormatDate(d.startDate),
    endDate: safeFormatDate(d.endDate),
    accountType: d.accountType,
    reason: d.reason || '',
  }
}

/**
 * GET /api/debarments/organisation
 * Lists active debarments for Organization-type accounts.
 * Query params: page, limit
 */
async function getOrganisationDebarments(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10)

    const stages = [
      ...buildBaseStages(),
      { $match: { accountType: 'Organization' } },
      { $sort: { startDate: -1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]

    const [result] = await Debarment.aggregate(stages)
    const items = (result?.data || []).map(toOrganisationRow)
    const totalCount = result?.totalCount?.[0]?.count || 0

    return res.json({
      debarments: items,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    })
  } catch (err) {
    console.error('getOrganisationDebarments error:', err)
    return res.status(500).json({ message: 'Failed to fetch organisation debarments' })
  }
}

/**
 * GET /api/debarments/individual
 * Lists active debarments for Individual-type accounts.
 * Query params: page, limit
 */
async function getIndividualDebarments(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10)

    const stages = [
      ...buildBaseStages(),
      { $match: { accountType: 'Individual' } },
      { $sort: { startDate: -1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]

    const [result] = await Debarment.aggregate(stages)
    const items = (result?.data || []).map(toIndividualRow)
    const totalCount = result?.totalCount?.[0]?.count || 0

    return res.json({
      debarments: items,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    })
  } catch (err) {
    console.error('getIndividualDebarments error:', err)
    return res.status(500).json({ message: 'Failed to fetch individual debarments' })
  }
}

/**
 * GET /api/debarments/counts
 * Returns active debarment counts for both account types in one call —
 * powers the Individual/Organisation tab badges.
 */
async function getDebarmentCounts(req, res) {
  try {
    const results = await Debarment.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$accountType', count: { $sum: 1 } } },
    ])

    const counts = { Individual: 0, Organization: 0 }
    results.forEach((r) => {
      if (r._id in counts) counts[r._id] = r.count
    })

    return res.json({
      individual: counts.Individual,
      organization: counts.Organization,
    })
  } catch (err) {
    console.error('getDebarmentCounts error:', err)
    return res.status(500).json({ message: 'Failed to fetch debarment counts' })
  }
}

/**
 * GET /api/debarments/search
 * Query params:
 *   REQUIRED: dateCriteria ("debarment_date" | "expiry_date"), fromDate, toDate
 *   optional: searchId        - Login ID (email), matched against either
 *             account type — no PAN search anymore
 *   optional: organisation    - matches organizationChain (partial, ci) —
 *             only ever matches Organization-type records (Individual
 *             records have organizationChain: null, so this naturally
 *             excludes them without any extra branching)
 *   optional: productCategory - matches productCategory (partial, ci) —
 *             only ever matches Individual-type records, same reasoning
 *   page, limit
 */
async function searchDebarments(req, res) {
  try {
    const dateCriteria = String(req.query.dateCriteria || '').trim()
    const fromDate = String(req.query.fromDate || '').trim()
    const toDate = String(req.query.toDate || '').trim()
    const searchId = String(req.query.searchId || '').trim()
    const organisation = String(req.query.organisation || '').trim()
    const productCategory = String(req.query.productCategory || '').trim()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10)

    // ── Required fields ──────────────────────────────────────────────────
    if (!dateCriteria || !fromDate || !toDate) {
      return res.status(400).json({
        message: 'dateCriteria, fromDate, and toDate are all required to search.',
      })
    }
    const dateField = DATE_CRITERIA_FIELD[dateCriteria]
    if (!dateField) {
      return res.status(400).json({ message: 'dateCriteria must be "debarment_date" or "expiry_date"' })
    }

    const from = new Date(fromDate)
    from.setHours(0, 0, 0, 0)
    const to = new Date(toDate)
    to.setHours(23, 59, 59, 999)
    if (from > to) {
      return res.status(400).json({ message: 'fromDate must be on or before toDate' })
    }

    const stages = [
      ...buildBaseStages(),
      { $match: { [dateField]: { $gte: from, $lte: to } } },
    ]

    if (searchId) {
      stages.push({ $match: { 'userDoc.email': { $regex: searchId, $options: 'i' } } })
    }
    if (organisation) {
      stages.push({ $match: { organizationChain: { $regex: organisation, $options: 'i' } } })
    }
    if (productCategory) {
      stages.push({ $match: { productCategory: { $regex: productCategory, $options: 'i' } } })
    }

    stages.push({ $sort: { startDate: -1 } })

    stages.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    })

    const [result] = await Debarment.aggregate(stages)
    const items = (result?.data || []).map(toSearchRow)
    const totalCount = result?.totalCount?.[0]?.count || 0

    return res.json({
      debarments: items,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    })
  } catch (err) {
    console.error('searchDebarments error:', err)
    return res.status(500).json({ message: 'Failed to search debarments' })
  }
}

module.exports = {
  getOrganisationDebarments,
  getIndividualDebarments,
  getDebarmentCounts,
  searchDebarments,
}