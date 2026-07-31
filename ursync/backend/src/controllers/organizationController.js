const Tender = require('../models/Tender')
const formatCurrency = require('../utils/formatCurrency')

const VALID_STATUSES = ['Ongoing', 'Upcoming', 'Completed']

const ORG_TYPE_KEYWORDS = {
  'Government Department': ['department', 'highways', 'rural'],
  'Corporation': ['corporation'],
  'Board': ['board', 'twad', 'tangedco'],
  'Municipality': ['municipality', 'municipal'],
  'Panchayat Union': ['panchayat'],
}
const ORGANIZATION_TYPES = Object.keys(ORG_TYPE_KEYWORDS)

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
    district: t.districtDoc ? t.districtDoc.name : (t.location || ''),
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
    status: t.status,
    isCancelled: t.isCancelled || false,
    isRetendered: t.isRetendered || false,
    cancelledReason: t.cancelledReason || null,
  }
}

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

    const stages = buildJoinStages(req)

    if (expiry) stages.push({ $match: { status: expiry } })
    if (organizationType) stages.push(orgTypeMatchStage(organizationType))
    if (tenderCategory) stages.push({ $match: { 'categoryDoc.name': tenderCategory } })
    if (district) stages.push({ $match: { $or: [{ 'districtDoc.name': district }, { location: district }] } })
    if (organization) stages.push({ $match: { $and: buildFreeTextClause(organization) } })

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

async function getStatusCounts(req, res) {
  try {
    const organization = String(req.query.organization || '').trim()
    const organizationType = String(req.query.organizationType || '').trim()
    const tenderCategory = String(req.query.tenderCategory || '').trim()
    const district = String(req.query.district || '').trim()

    const stages = buildJoinStages(req)

    if (organizationType) stages.push(orgTypeMatchStage(organizationType))
    if (tenderCategory) stages.push({ $match: { 'categoryDoc.name': tenderCategory } })
    if (district) stages.push({ $match: { $or: [{ 'districtDoc.name': district }, { location: district }] } })
    if (organization) stages.push({ $match: { $and: buildFreeTextClause(organization) } })

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

async function getOrganizationFilterMeta(req, res) {
  try {
    const stages = buildJoinStages(req)

    const [categoryDocs, districtDocs] = await Promise.all([
      Tender.aggregate([...stages, { $group: { _id: '$categoryDoc.name' } }, { $sort: { _id: 1 } }]),
      Tender.aggregate([...stages, { $group: { _id: { $ifNull: ['$districtDoc.name', '$location'] } } }, { $sort: { _id: 1 } }]),
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

module.exports = { searchTendersByOrganization, getStatusCounts, getOrganizationFilterMeta }