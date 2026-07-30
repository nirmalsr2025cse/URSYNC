// src/controllers/organizationController.js
// Backs TenderByOrganization.jsx: free-text search + organizationType +
// tenderCategory + district + status(expiry) filters, all combinable,
// cheap enough to call on every debounced keystroke.

const Tender = require('../models/Tender')
const formatCurrency = require('../utils/formatCurrency')

const VALID_STATUSES = ['Ongoing', 'Upcoming', 'Completed']

// Department model has no organizationType field, so we classify by
// keyword — the same rule set the frontend used to apply client-side
// (matchOrgType in TenderByOrganization.jsx).
const ORG_TYPE_KEYWORDS = {
  'Government Department': ['department', 'highways', 'rural'],
  'Corporation': ['corporation'],
  'Board': ['board', 'twad', 'tangedco'],
  'Municipality': ['municipality', 'municipal'],
  'Panchayat Union': ['panchayat'],
}
const ORGANIZATION_TYPES = Object.keys(ORG_TYPE_KEYWORDS)

function buildBaseStages(req) {
  const stages = [
    { $match: { isDeleted: false, isCancelled: false } },
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
    // districtId is NOT required on the real schema, so preserve docs
    // that have no matching district.
    { $unwind: { path: '$districtDoc', preserveNullAndEmptyArrays: true } },
  ]

  if (req.isDepartmentRestricted && req.departmentCode) {
    stages.push({ $match: { 'departmentDoc.code': req.departmentCode } })
  }

  return stages
}

function toCardShape(t) {
  return {
    id: t.tenderCode,
    tenderCode: t.tenderCode,
    title: t.title,
    description: t.description,
    image: t.image,
    documentUrl: t.documentUrl || null,

    department: t.departmentDoc.name,
    departmentCode: t.departmentDoc.code,
    organizationName: t.departmentDoc.organization || t.departmentDoc.name,

    category: t.categoryDoc.name,
    district: t.districtDoc ? t.districtDoc.name : (t.location || ''),
    location: t.location || (t.districtDoc ? t.districtDoc.name : ''),

    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,
    startDate: t.startDate,
    closingDate: t.closingDate,
    status: t.status,
  }
}

// Flags a department as belonging to `type` by checking its
// name/organization/code against that type's keyword list.
function orgTypeMatchStage(type) {
  const keywords = ORG_TYPE_KEYWORDS[type] || []
  const fieldsToCheck = ['departmentDoc.name', 'departmentDoc.organization', 'departmentDoc.code']

  const orClauses = []
  keywords.forEach((kw) => {
    fieldsToCheck.forEach((field) => {
      orClauses.push({ [field]: { $regex: kw, $options: 'i' } })
    })
  })

  return { $match: { $or: orClauses } }
}

function buildFreeTextClause(organization) {
  const words = organization.split(/\s+/).filter(Boolean)
  return words.map((w) => {
    const regex = { $regex: w, $options: 'i' }
    return {
      $or: [
        { 'departmentDoc.organization': regex },
        { 'departmentDoc.name': regex },
        { 'departmentDoc.code': regex },
        { title: regex },
        { description: regex },
        { tenderCode: regex },
        { 'categoryDoc.name': regex },
        { 'districtDoc.name': regex },
        { location: regex },
      ],
    }
  })
}

/**
 * GET /api/tenders/by-organization
 * Query params (all optional, all combinable):
 *   organization      - free text: org name, title, department, district,
 *                        category, tender code, description
 *   organizationType  - one of ORGANIZATION_TYPES
 *   tenderCategory    - category name
 *   district          - district name
 *   expiry            - Ongoing | Upcoming | Completed  (maps to `status`)
 *   page, limit
 */
async function searchTendersByOrganization(req, res) {
  try {
    const organization = String(req.query.organization || '').trim()
    const organizationType = String(req.query.organizationType || '').trim()
    const tenderCategory = String(req.query.tenderCategory || '').trim()
    const district = String(req.query.district || '').trim()
    const expiry = String(req.query.expiry || '').trim()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    if (expiry && !VALID_STATUSES.includes(expiry)) {
      return res.status(400).json({ message: `expiry must be one of ${VALID_STATUSES.join(', ')}` })
    }
    if (organizationType && !ORGANIZATION_TYPES.includes(organizationType)) {
      return res.status(400).json({ message: `organizationType must be one of ${ORGANIZATION_TYPES.join(', ')}` })
    }

    const stages = buildBaseStages(req)

    if (expiry) stages.push({ $match: { status: expiry } })
    if (organizationType) stages.push(orgTypeMatchStage(organizationType))
    if (tenderCategory) stages.push({ $match: { 'categoryDoc.name': tenderCategory } })
    if (district) {
      stages.push({ $match: { $or: [{ 'districtDoc.name': district }, { location: district }] } })
    }
    if (organization) {
      stages.push({ $match: { $and: buildFreeTextClause(organization) } })
    }

    stages.push({ $sort: { closingDate: 1 } })

    stages.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    })

    const [result] = await Tender.aggregate(stages)
    const items = (result?.data || []).map(toCardShape)
    const totalCount = result?.totalCount?.[0]?.count || 0

    return res.json({
      tenders: items,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    })
  } catch (err) {
    console.error('searchTendersByOrganization error:', err)
    return res.status(500).json({ message: 'Failed to search tenders' })
  }
}

/**
 * GET /api/tenders/by-organization/status-counts
 * Same filters as above (minus `expiry`) — powers the tab bar counts so
 * they stay accurate while other filters (search/type/category/district)
 * are active, even though the current page of results is status-filtered.
 */
async function getStatusCounts(req, res) {
  try {
    const organization = String(req.query.organization || '').trim()
    const organizationType = String(req.query.organizationType || '').trim()
    const tenderCategory = String(req.query.tenderCategory || '').trim()
    const district = String(req.query.district || '').trim()

    const stages = buildBaseStages(req)

    if (organizationType) stages.push(orgTypeMatchStage(organizationType))
    if (tenderCategory) stages.push({ $match: { 'categoryDoc.name': tenderCategory } })
    if (district) {
      stages.push({ $match: { $or: [{ 'districtDoc.name': district }, { location: district }] } })
    }
    if (organization) {
      stages.push({ $match: { $and: buildFreeTextClause(organization) } })
    }

    stages.push({ $group: { _id: '$status', count: { $sum: 1 } } })

    const results = await Tender.aggregate(stages)
    const counts = { Ongoing: 0, Upcoming: 0, Completed: 0 }
    results.forEach((r) => {
      if (r._id in counts) counts[r._id] = r.count
    })

    return res.json({
      ongoing: counts.Ongoing,
      upcoming: counts.Upcoming,
      completed: counts.Completed,
      all: counts.Ongoing + counts.Upcoming + counts.Completed,
    })
  } catch (err) {
    console.error('getStatusCounts error:', err)
    return res.status(500).json({ message: 'Failed to fetch status counts' })
  }
}

/**
 * GET /api/tenders/by-organization/meta
 * Dropdown option lists, always reflecting real data currently in use.
 */
async function getOrganizationFilterMeta(req, res) {
  try {
    const stages = buildBaseStages(req)

    const [categoryDocs, districtDocs] = await Promise.all([
      Tender.aggregate([...stages, { $group: { _id: '$categoryDoc.name' } }, { $sort: { _id: 1 } }]),
      Tender.aggregate([
        ...stages,
        { $group: { _id: { $ifNull: ['$districtDoc.name', '$location'] } } },
        { $sort: { _id: 1 } },
      ]),
    ])

    return res.json({
      organizationTypes: ORGANIZATION_TYPES,
      statuses: VALID_STATUSES,
      categories: categoryDocs.map((d) => d._id).filter(Boolean),
      districts: districtDocs.map((d) => d._id).filter(Boolean),
    })
  } catch (err) {
    console.error('getOrganizationFilterMeta error:', err)
    return res.status(500).json({ message: 'Failed to fetch filter options' })
  }
}

module.exports = {
  searchTendersByOrganization,
  getStatusCounts,
  getOrganizationFilterMeta,
}