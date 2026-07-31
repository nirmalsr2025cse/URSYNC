// src/controllers/cancelledRetenderedController.js
const mongoose = require('mongoose')
const Tender = require('../models/Tender')
const formatCurrency = require('../utils/formatCurrency')

const DEPT_RESTRICTED_ROLES = ['department_employee', 'department_head']

function buildJoinStages(req, tab) {
  const stages = [
    { $match: { isDeleted: false, ...(tab === 'cancelled' ? { isCancelled: true } : { isRetendered: true }) } },
    { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'departmentDoc' } },
    { $unwind: '$departmentDoc' },
    { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
    { $unwind: '$categoryDoc' },
    { $lookup: { from: 'districts', localField: 'districtId', foreignField: '_id', as: 'districtDoc' } },
    { $unwind: { path: '$districtDoc', preserveNullAndEmptyArrays: true } },
  ]

  // FIX: role lives on req.role (set by authMiddleware), not req.user.role
  const role = req.role
  if (DEPT_RESTRICTED_ROLES.includes(role) && req.departmentCode) {
    stages.push({ $match: { 'departmentDoc.code': req.departmentCode } })
  }
  // FIX: req.user is a Mongoose doc — use ._id (already an ObjectId), no need to re-wrap
  if (role === 'tender_person' && req.user?._id) {
    stages.push({ $match: { cancelledBy: req.user._id } })
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
    taluk: t.taluk || '',
    village: t.village || '',
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    duration: t.duration || '',
    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,
    startDate: t.startDate,
    closingDate: tab === 'cancelled' ? t.cancelledAt : t.retenderedAt,
    status: t.status,
    isCancelled: t.isCancelled || false,
    isRetendered: t.isRetendered || false,
    cancelledReason: t.cancelledReason || null,
    cancelledAt: t.cancelledAt || null,
    retenderedAt: t.retenderedAt || null,
    originalTenderId: t.originalTenderId || null,
  }
}

async function getCancelledRetenderedTenders(req, res) {
  try {
    const tab = String(req.query.tab || '').trim()
    if (!['cancelled', 'retendered'].includes(tab)) {
      return res.status(400).json({ message: 'tab must be "cancelled" or "retendered"' })
    }

    if (tab === 'retendered' && req.role === 'tender_person') {
      return res.json({ tenders: [], totalCount: 0, totalPages: 1, currentPage: 1 })
    }

    const search = String(req.query.search || '').trim()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    const stages = buildJoinStages(req, tab)

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

    stages.push({ $sort: tab === 'cancelled' ? { cancelledAt: -1 } : { retenderedAt: -1 } })
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