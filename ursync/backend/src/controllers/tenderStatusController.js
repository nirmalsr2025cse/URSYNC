// src/controllers/tenderStatusController.js
// Backs TenderStatusPage.jsx — three search criteria tabs sharing one
// aggregation. Whichever tab is active on the frontend only sends its own
// fields; any field left out (undefined/empty) is simply not filtered on.

const Tender = require('../models/Tender')
const Department = require('../models/Department')
const Category = require('../models/Category')
const formatCurrency = require('../utils/formatCurrency')
const { buildDateRangeMatch } = require('../utils/dateRange')

const TENDER_STATUS_OPTIONS = ['Ongoing', 'Upcoming', 'Completed']
const PRODUCT_CATEGORY_OPTIONS = ['Works', 'Goods', 'Services']

function buildBaseStages(req) {
  const stages = [
    { $match: { isDeleted: false, isCancelled: false  } },
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

  // Same department-scoping pattern used in archiveController — a
  // department-restricted user only ever sees their own department's data,
  // regardless of what filters they pass.
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
    productCategory: t.procurementType,
    district: t.location || (t.districtDoc ? t.districtDoc.name : ''),

    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,
    startDate: t.startDate,
    closingDate: t.closingDate,
    publishedDate: t.startDate, // "published" == start date on this schema
    status: t.status,
  }
}

/**
 * GET /api/tenders/status
 * Query params (all optional — a param that is missing/empty is not
 * filtered on):
 *
 *   Criteria I:
 *     tenderStatus     - Ongoing | Upcoming | Completed
 *     fromDate, toDate - filters on startDate ("published" date)
 *     tenderCategory   - Category name
 *     productCategory  - Works | Goods | Services
 *
 *   Criteria II:
 *     organization       - matches department.organization (partial, ci)
 *     department         - matches department.name (partial, ci)
 *     publishedFrom/To   - same field as fromDate/toDate above
 *
 *   Criteria III:
 *     tenderId - matches tenderCode (partial, ci)
 *
 *   page, limit
 */
async function searchTendersByStatus(req, res) {
  try {
    const {
      tenderStatus,
      fromDate,
      toDate,
      tenderCategory,
      productCategory,
      organization,
      department,
      publishedFrom,
      publishedTo,
      tenderId,
    } = req.query

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    const stages = buildBaseStages(req)

    if (tenderStatus) {
      stages.push({ $match: { status: tenderStatus } })
    }

    if (tenderCategory) {
      stages.push({ $match: { 'categoryDoc.name': tenderCategory } })
    }

    if (productCategory) {
      stages.push({ $match: { procurementType: productCategory } })
    }

    if (organization) {
      stages.push({
        $match: { 'departmentDoc.organization': { $regex: organization, $options: 'i' } },
      })
    }

    if (department) {
      stages.push({
        $match: { 'departmentDoc.name': { $regex: department, $options: 'i' } },
      })
    }

    if (tenderId) {
      stages.push({
        $match: { tenderCode: { $regex: tenderId, $options: 'i' } },
      })
    }

    // Criteria I's fromDate/toDate and Criteria II's publishedFrom/publishedTo
    // both filter the same underlying field (startDate) — only one pair will
    // ever be populated at once since only one tab is active client-side,
    // but merging them here means it works either way without extra branching.
    const effectiveFrom = fromDate || publishedFrom
    const effectiveTo = toDate || publishedTo
    const dateMatch = buildDateRangeMatch('startDate', effectiveFrom, effectiveTo)
    if (dateMatch) {
      stages.push({ $match: dateMatch })
    }

    stages.push({ $sort: { closingDate: -1 } })

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
    console.error('searchTendersByStatus error:', err)
    return res.status(500).json({ message: 'Failed to search tenders' })
  }
}

/**
 * GET /api/tenders/status/meta
 * Dropdown option lists for Criteria I and II, pulled from real data.
 */
async function getStatusMeta(req, res) {
  try {
    const deptFilter = { isActive: true }
    if (req.isDepartmentRestricted && req.departmentCode) {
      deptFilter.code = req.departmentCode
    }

    const [departments, categories] = await Promise.all([
      Department.find(deptFilter).select('name organization').lean(),
      Category.find({ isActive: true }).select('name').lean(),
    ])

    const organizations = [
      ...new Set(departments.map((d) => d.organization || d.name).filter(Boolean)),
    ].sort()
    const departmentNames = [...new Set(departments.map((d) => d.name))].sort()
    const categoryNames = categories.map((c) => c.name).sort()

    return res.json({
      tenderStatuses: TENDER_STATUS_OPTIONS,
      productCategories: PRODUCT_CATEGORY_OPTIONS,
      tenderCategories: categoryNames,
      organizations,
      departments: departmentNames,
    })
  } catch (err) {
    console.error('getStatusMeta error:', err)
    return res.status(500).json({ message: 'Failed to load filter options' })
  }
}

module.exports = { searchTendersByStatus, getStatusMeta }