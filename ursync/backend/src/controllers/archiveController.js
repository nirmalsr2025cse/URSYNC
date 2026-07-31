const Tender = require('../models/Tender')
const formatCurrency = require('../utils/formatCurrency')

function buildJoinStages(req) {
  const stages = [
    { $match: { isDeleted: false, isCancelled: false, status: 'Completed' } },
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
    category: t.categoryDoc.name,
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

async function searchArchivedTenders(req, res) {
  try {
    const search = String(req.query.search || '').trim()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    const stages = buildJoinStages(req)

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
    console.error('searchArchivedTenders error:', err)
    return res.status(500).json({ message: 'Failed to search archived tenders' })
  }
}

module.exports = { searchArchivedTenders }