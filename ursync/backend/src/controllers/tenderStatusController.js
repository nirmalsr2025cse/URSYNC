const Tender = require('../models/Tender')
const Department = require('../models/Department')
const Category = require('../models/Category')
const formatCurrency = require('../utils/formatCurrency')
const { buildDateRangeMatch } = require('../utils/dateRange')

const TENDER_STATUS_OPTIONS = ['Ongoing', 'Upcoming', 'Completed']
const PRODUCT_CATEGORY_OPTIONS = ['Works', 'Goods', 'Services']

function buildJoinStages(req) {
  const stages = [
    { $match: { isDeleted: false, isCancelled: false } },
    { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'departmentDoc' } },
    { $unwind: '$departmentDoc' },
    { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
    { $unwind: '$categoryDoc' },
    { $lookup: { from: 'districts', localField: 'districtId', foreignField: '_id', as: 'districtDoc' } },
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
    organization: t.departmentDoc.organization || t.departmentDoc.name,
    organizationName: t.departmentDoc.organization || t.departmentDoc.name,
    category: t.categoryDoc.name,
    productCategory: t.procurementType,
    district: t.location || (t.districtDoc ? t.districtDoc.name : ''),
    location: t.location || (t.districtDoc ? t.districtDoc.name : ''),
    taluk: t.taluk || '',
    village: t.village || '',
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    duration: t.duration || '',
    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,
    startDate: t.startDate,
    closingDate: t.closingDate,
    publishedDate: t.startDate,
    status: t.status,
    isCancelled: t.isCancelled || false,
    isRetendered: t.isRetendered || false,
    cancelledReason: t.cancelledReason || null,
  }
}

async function searchTendersByStatus(req, res) {
  try {
    const {
      tenderStatus, fromDate, toDate, tenderCategory, productCategory,
      organization, department, publishedFrom, publishedTo, tenderId,
    } = req.query

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    const stages = buildJoinStages(req)

    if (tenderStatus) stages.push({ $match: { status: tenderStatus } })
    if (tenderCategory) stages.push({ $match: { 'categoryDoc.name': tenderCategory } })
    if (productCategory) stages.push({ $match: { procurementType: productCategory } })
    if (organization) stages.push({ $match: { 'departmentDoc.organization': { $regex: organization, $options: 'i' } } })
    if (department) stages.push({ $match: { 'departmentDoc.name': { $regex: department, $options: 'i' } } })
    if (tenderId) stages.push({ $match: { tenderCode: { $regex: tenderId, $options: 'i' } } })

    const effectiveFrom = fromDate || publishedFrom
    const effectiveTo = toDate || publishedTo
    const dateMatch = buildDateRangeMatch('startDate', effectiveFrom, effectiveTo)
    if (dateMatch) stages.push({ $match: dateMatch })

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

    const organizations = [...new Set(departments.map((d) => d.organization || d.name).filter(Boolean))].sort()
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