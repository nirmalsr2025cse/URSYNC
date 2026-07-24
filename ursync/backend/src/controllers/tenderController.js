// src/controllers/tenderController.js
const Tender = require('../models/Tender')
const formatCurrency = require('../utils/formatCurrency')

const VALID_STATUSES = ['Ongoing', 'Upcoming', 'Completed']

function buildJoinStages(req) {
  const stages = [
    { $match: { isDeleted: false } },
    {
      $lookup: { //Integrate the other collection
        from: 'departments',
        localField: 'departmentId',
        foreignField: '_id',
        as: 'departmentDoc',
      },
    },
    { $unwind: '$departmentDoc' }, //Make the reterived data as Object 
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
    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,
    startDate: t.startDate,
    closingDate: t.closingDate,
    status: t.status,
  }
}

async function listTenders(req, res) {
  try {
    const status = String(req.query.status || 'ongoing')
    const search = String(req.query.search || '').trim()
    const category = String(req.query.category || 'All')
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    const statusEnum = status.charAt(0).toUpperCase() + status.slice(1)
    if (!VALID_STATUSES.includes(statusEnum)) {
      return res.status(400).json({ message: `status must be one of ${VALID_STATUSES.join(', ')}` })
    }

    const stages = buildJoinStages(req) //Stores aggreation pipeline commands
    stages.push({ $match: { status: statusEnum } })

    if (category && category !== 'All') {
      stages.push({ $match: { 'categoryDoc.name': category } })
    }

    if (search) {
      const regex = { $regex: search, $options: 'i' }
      stages.push({
        $match: {
          $or: [
            { title: regex },
            { tenderCode: regex },
            { location: regex },
            { 'departmentDoc.name': regex },
          ],
        },
      })
    }

    stages.push({ $sort: { closingDate: 1 } })

    stages.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }], //Both depend only on stages seperately
        totalCount: [{ $count: 'count' }],
      },
    })

    const [result] = await Tender.aggregate(stages) //Runs all the aggreation pipeline
    const items = result.data.map(toCardShape)
    const totalCount = result.totalCount[0] ? result.totalCount[0].count : 0

    return res.json({
      tenders: items,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    })
  } catch (err) {
    console.error('listTenders error:', err)
    return res.status(500).json({ message: 'Failed to fetch tenders' })
  }
}

async function getStats(req, res) {
  try {
    const stages = buildJoinStages(req)
    stages.push({ $group: { _id: '$status', count: { $sum: 1 } } }) ///Group JSON Files Based on Status

    const results = await Tender.aggregate(stages)

    const stats = { ongoing: 0, upcoming: 0, completed: 0 }
    results.forEach((r) => {
      const key = String(r._id || '').toLowerCase()
      if (key in stats) stats[key] = r.count
    })

    return res.json({ ...stats, total: stats.ongoing + stats.upcoming + stats.completed })
  } catch (err) {
    console.error('getStats error:', err)
    return res.status(500).json({ message: 'Failed to fetch tender stats' })
  }
}

async function getCategories(req, res) {
  try {
    const stages = buildJoinStages(req)
    stages.push({ $group: { _id: '$categoryDoc.name' } })
    stages.push({ $sort: { _id: 1 } })

    const results = await Tender.aggregate(stages)
    const categories = results.map((r) => r._id).filter(Boolean)

    return res.json({ categories: ['All', ...categories] })
  } catch (err) {
    console.error('getCategories error:', err)
    return res.status(500).json({ message: 'Failed to fetch categories' })
  }
}

async function getTenderByCode(req, res) {
  try {
    const stages = buildJoinStages(req)
    stages.push({ $match: { tenderCode: req.params.tenderCode } })

    const [tender] = await Tender.aggregate(stages)
    if (!tender) return res.status(404).json({ message: 'Tender not found' })

    return res.json({ tender: toCardShape(tender) })
  } catch (err) {
    console.error('getTenderByCode error:', err)
    return res.status(500).json({ message: 'Failed to fetch tender' })
  }
}

module.exports = { listTenders, getStats, getCategories, getTenderByCode }