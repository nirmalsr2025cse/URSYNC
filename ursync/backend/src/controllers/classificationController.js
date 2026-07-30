// src/controllers/classificationController.js
// Backs TenderByClassification.jsx: keyword + classification + category +
// productCategory + organizationType + district + status (via the "Sort By"
// dropdown, which now offers Ongoing/Upcoming/Completed) + value range,
// all combinable, auto-search friendly.

const Tender = require('../models/Tender')
const formatCurrency = require('../utils/formatCurrency')

const VALID_STATUSES = ['Ongoing', 'Upcoming', 'Completed']
const VALID_CLASSIFICATIONS = ['Works', 'Goods', 'Services'] // matches Tender.procurementType enum

// Department model has no organizationType field — classify by keyword,
// same rule set used across the tenders-by-organisation page.
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
    { $match: { isDeleted: false } },
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

  if (req.isDepartmentRestricted && req.departmentCode) {
    stages.push({ $match: { 'departmentDoc.code': req.departmentCode } })
  }

  return stages
}

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

function buildKeywordClause(keyword) {
  const words = keyword.split(/\s+/).filter(Boolean)
  return words.map((w) => {
    const regex = { $regex: w, $options: 'i' }
    return {
      $or: [
        { title: regex },
        { description: regex },
        { tenderCode: regex },
        { 'departmentDoc.name': regex },
        { 'departmentDoc.organization': regex },
        { 'categoryDoc.name': regex },
        { 'districtDoc.name': regex },
        { location: regex },
        { productCategory: regex },
      ],
    }
  })
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

    classification: t.procurementType,
    category: t.categoryDoc.name,
    productCategory: t.productCategory || '',
    district: t.districtDoc ? t.districtDoc.name : (t.location || ''),
    location: t.location || (t.districtDoc ? t.districtDoc.name : ''),

    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,
    startDate: t.startDate,
    closingDate: t.closingDate,
    status: t.status,
  }
}

/**
 * GET /api/tenders/by-classification
 * Query params (all optional, all combinable):
 *   keyword           - free text across title/description/id/dept/org/category/district/productCategory
 *   classification    - Works | Goods | Services   (Tender.procurementType)
 *   category          - category name
 *   productCategory   - product category text
 *   organizationType  - one of ORGANIZATION_TYPES
 *   district          - district name
 *   status            - Ongoing | Upcoming | Completed
 *   minValue, maxValue- estimated value range (numbers)
 *   page, limit
 */
async function searchTendersByClassification(req, res) {
  try {
    const keyword = String(req.query.keyword || '').trim()
    const classification = String(req.query.classification || '').trim()
    const category = String(req.query.category || '').trim()
    const productCategory = String(req.query.productCategory || '').trim()
    const organizationType = String(req.query.organizationType || '').trim()
    const district = String(req.query.district || '').trim()
    const status = String(req.query.status || '').trim()
    const minValue = req.query.minValue !== undefined ? Number(req.query.minValue) : null
    const maxValue = req.query.maxValue !== undefined ? Number(req.query.maxValue) : null
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of ${VALID_STATUSES.join(', ')}` })
    }
    if (classification && !VALID_CLASSIFICATIONS.includes(classification)) {
      return res.status(400).json({ message: `classification must be one of ${VALID_CLASSIFICATIONS.join(', ')}` })
    }
    if (organizationType && !ORGANIZATION_TYPES.includes(organizationType)) {
      return res.status(400).json({ message: `organizationType must be one of ${ORGANIZATION_TYPES.join(', ')}` })
    }

    const stages = buildBaseStages(req)

    if (status) stages.push({ $match: { status } })
    if (classification) stages.push({ $match: { procurementType: classification } })
    if (category) stages.push({ $match: { 'categoryDoc.name': category } })
    if (productCategory) stages.push({ $match: { productCategory: { $regex: productCategory, $options: 'i' } } })
    if (organizationType) stages.push(orgTypeMatchStage(organizationType))
    if (district) {
      stages.push({ $match: { $or: [{ 'districtDoc.name': district }, { location: district }] } })
    }
    if (minValue !== null || maxValue !== null) {
      const valueMatch = {}
      if (minValue !== null && !Number.isNaN(minValue)) valueMatch.$gte = minValue
      if (maxValue !== null && !Number.isNaN(maxValue)) valueMatch.$lt = maxValue
      stages.push({ $match: { estimatedValue: valueMatch } })
    }
    if (keyword) {
      stages.push({ $match: { $and: buildKeywordClause(keyword) } })
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
    console.error('searchTendersByClassification error:', err)
    return res.status(500).json({ message: 'Failed to search tenders' })
  }
}

/**
 * GET /api/tenders/by-classification/meta
 * Dropdown option lists, reflecting real data currently in use.
 */
async function getClassificationFilterMeta(req, res) {
  try {
    const stages = buildBaseStages(req)

    const [categoryDocs, districtDocs, productCategoryDocs] = await Promise.all([
      Tender.aggregate([...stages, { $group: { _id: '$categoryDoc.name' } }, { $sort: { _id: 1 } }]),
      Tender.aggregate([
        ...stages,
        { $group: { _id: { $ifNull: ['$districtDoc.name', '$location'] } } },
        { $sort: { _id: 1 } },
      ]),
      Tender.aggregate([
        ...stages,
        { $match: { productCategory: { $nin: [null, ''] } } },
        { $group: { _id: '$productCategory' } },
        { $sort: { _id: 1 } },
      ]),
    ])

    return res.json({
      classifications: VALID_CLASSIFICATIONS,
      organizationTypes: ORGANIZATION_TYPES,
      statuses: VALID_STATUSES,
      categories: categoryDocs.map((d) => d._id).filter(Boolean),
      districts: districtDocs.map((d) => d._id).filter(Boolean),
      productCategories: productCategoryDocs.map((d) => d._id).filter(Boolean),
    })
  } catch (err) {
    console.error('getClassificationFilterMeta error:', err)
    return res.status(500).json({ message: 'Failed to fetch filter options' })
  }
}

module.exports = { searchTendersByClassification, getClassificationFilterMeta }