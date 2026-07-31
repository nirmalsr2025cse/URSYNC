// src/controllers/createTender.controller.js
const CreateTender = require('../models/CreateTender')
const User = require('../models/User')

// ── helper: format a Mongo tender doc into the shape CreateSavedTenders.jsx expects ──
// Maps EVERY field defined in CreateTender.model.js — keep this in sync if the
// schema changes, otherwise new/renamed fields will silently vanish from the API response.
function formatTender(t) {
  return {
    id: t._id.toString(),
    projectName: t.title,
    description: t.description || '',
    status: t.status,
    priority: t.priority || 'Low',
    department: t.departmentId?.name || '—',
    category: t.categoryId?.name || '—',
    tenderType: t.tenderType || 'Open',
    district: t.districtId?.name || '—',
    location: t.location || '',
    taluk: t.taluk || '',
    village: t.village || '—',
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    duration: t.duration || '',
    startDate: t.startDate,
    endDate: t.closingDate,
    amount: t.estimatedValue,
    currency: t.currency || 'INR',
    image: t.image,
    documentUrl: t.documentUrl || '',
    sentTo: t.sentTo ? t.sentTo.toString() : null,
    lastUpdated: t.updatedAt,
    createdBy: t.createdBy?._id?.toString(),
    createdByRole: t.createdBy?.roleId?.name || null,
  }
}

// ── GET /api/create-tenders ─────────────────────────────────────────────
// Role-based visibility:
//  - department_employee: any Draft tender within their own department
//    (not limited to tenders they personally created)
//  - department_head: only tenders THIS head created themselves (never other heads'), same department
//  - administrator / others: everything (not deleted)
exports.getTenders = async (req, res) => {
  try {
    const currentUser = req.user
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const me = await User.findById(currentUser._id || currentUser.id)
      .populate('roleId')
      .populate('departmentId')

    if (!me) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const roleName = me.roleId?.name
    const myDepartmentId = me.departmentId?._id || me.departmentId
    const baseQuery = { isDeleted: false }

    if (roleName === 'department_employee') {
      baseQuery.departmentId = myDepartmentId
      baseQuery.status = 'Draft'
    } else if (roleName === 'department_head') {
      baseQuery.createdBy = me._id
      baseQuery.departmentId = myDepartmentId
    }
    // administrator / financial / tender_authority → no extra restriction

    const tenders = await CreateTender.find(baseQuery)
      .populate('departmentId', 'name')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .populate({
        path: 'createdBy',
        select: 'fullName email roleId',
        populate: { path: 'roleId', select: 'name' },
      })
      .sort({ updatedAt: -1 })
      .lean()

    const data = tenders.map(formatTender)

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    })
  } catch (err) {
    console.error('getTenders error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/create-tenders/:id ─────────────────────────────────────────
exports.getTenderById = async (req, res) => {
  try {
    const currentUser = req.user
    const me = await User.findById(currentUser._id || currentUser.id).populate('roleId')
    const roleName = me?.roleId?.name

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: false })
      .populate('departmentId', 'name')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .populate({
        path: 'createdBy',
        select: 'fullName email roleId departmentId',
        populate: { path: 'roleId', select: 'name' },
      })

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    if (roleName === 'department_employee' || roleName === 'department_head') {
      if (tender.createdBy._id.toString() !== me._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this tender' })
      }
    }

    return res.status(200).json({ success: true, data: formatTender(tender) })
  } catch (err) {
    console.error('getTenderById error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── POST /api/create-tenders ─────────────────────────────────────────────
exports.createTender = async (req, res) => {
  try {
    const currentUser = req.user
    const me = await User.findById(currentUser._id || currentUser.id)

    const {
      title,
      description,
      categoryId,
      districtId,
      location,
      taluk,
      village,
      latitude,
      longitude,
      estimatedValue,
      currency,
      duration,
      startDate,
      closingDate,
      tenderType,
      priority,
      image,
      documentUrl,
    } = req.body

    if (!title || !categoryId || !districtId || !estimatedValue) {
      return res.status(400).json({
        success: false,
        message: 'title, categoryId, districtId and estimatedValue are required',
      })
    }

    const tender = await CreateTender.create({
      title,
      description,
      departmentId: me.departmentId,
      categoryId,
      districtId,
      location,
      taluk,
      village,
      latitude,
      longitude,
      estimatedValue,
      currency,
      duration,
      startDate,
      closingDate,
      tenderType,
      priority,
      image,
      documentUrl,
      createdBy: me._id,
      status: 'Draft',
    })

    return res.status(201).json({ success: true, data: tender })
  } catch (err) {
    console.error('createTender error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PUT /api/create-tenders/:id ───────────────────────────────────────────
exports.updateTender = async (req, res) => {
  try {
    const currentUser = req.user
    const me = await User.findById(currentUser._id || currentUser.id)

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    if (tender.createdBy.toString() !== me._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this tender' })
    }

    const allowedFields = [
      'title', 'description', 'categoryId', 'districtId', 'location', 'taluk',
      'village', 'latitude', 'longitude', 'estimatedValue', 'currency',
      'duration', 'startDate', 'closingDate', 'tenderType', 'priority',
      'image', 'documentUrl', 'status',
    ]

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) tender[field] = req.body[field]
    })

    tender.updatedBy = me._id
    await tender.save()

    return res.status(200).json({ success: true, data: tender })
  } catch (err) {
    console.error('updateTender error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── DELETE /api/create-tenders/:id  (soft delete) ─────────────────────────
exports.deleteTender = async (req, res) => {
  try {
    const currentUser = req.user
    const me = await User.findById(currentUser._id || currentUser.id)

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    if (tender.createdBy.toString() !== me._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this tender' })
    }

    tender.isDeleted = true
    tender.deletedAt = new Date()
    await tender.save()

    return res.status(200).json({ success: true, message: 'Tender deleted successfully' })
  } catch (err) {
    console.error('deleteTender error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}