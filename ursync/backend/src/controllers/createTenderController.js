// src/controllers/createTenderController.js
//
// Role rules implemented here:
//
// department_employee:
//   - Save (create/update)  -> always ends up status: 'Draft'
//   - "Send to Head"        -> status: 'Sent to Head', sentTo: the
//                              department_head user in the SAME department
//   - List view             -> ONLY this employee's own Draft tenders.
//                              Other employees' drafts (same department or
//                              any other department) are NEVER shown, for
//                              security reasons.
//
// department_head:
//   - Save (create/update)  -> if the tender is in Draft and createdBy is
//                              this same head, it stays 'Draft' (Save never
//                              transitions status — only the explicit
//                              "Send to Administrator" action does)
//   - CAN ALSO edit a tender that is NOT their own draft, as long as it is
//     currently status: 'Sent to Head' AND sentTo === this head's own _id
//     — i.e. an employee's tender that was routed to them for review. This
//     edit does NOT reset status back to 'Draft'; it stays 'Sent to Head'
//     so the head can still explicitly "Send to Administrator" afterward.
//   - "Send to Administrator" -> status: 'Sent to Administrator', sentTo:
//                              an active administrator user
//   - List view             -> ONLY this head's OWN Draft tenders in their
//                              department. 'Sent to Head' tenders (things
//                              employees sent them) are explicitly EXCLUDED
//                              from this view — that belongs to a separate
//                              "Pending/Approvement" page, not this list.
//
// administrator / financial / tender_authority -> unrestricted, see everything.

const CreateTender = require('../models/CreateTender')
const User = require('../models/User')
const Role = require('../models/Role')
const Category = require('../models/Category')
const District = require('../models/District')

// ── helper: format a Mongo tender doc into the shape CreateSavedTenders.jsx / TenderView.jsx expect ──
function formatTender(t) {
  return {
    id: t._id.toString(),
    tenderId: t.tenderId,
    title: t.title,
    projectName: t.title,
    description: t.description || '',
    status: t.status,
    priority: t.priority || 'Low',
    department: t.departmentId?.name || '—',
    departmentCode: t.departmentId?.code || '—',
    organization: t.departmentId?.name || '—',
    category: t.categoryId?.name || '—',
    categoryId: t.categoryId?._id?.toString() || null,
    tenderType: t.tenderType || 'Open',
    district: t.districtId?.name || '—',
    districtId: t.districtId?._id?.toString() || null,
    location: t.location || '',
    taluk: t.taluk || '',
    village: t.village || '—',
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    duration: t.duration || '',
    startDate: t.startDate,
    endDate: t.closingDate,
    closingDate: t.closingDate,
    amount: t.estimatedValue,
    value: t.estimatedValue,
    currency: t.currency || 'INR',
    image: t.image,
    documentUrl: t.documentUrl || '',
    sentTo: t.sentTo ? t.sentTo.toString() : null,
    lastUpdated: t.updatedAt,
    createdBy: t.createdBy?._id?.toString(),
    createdByRole: t.createdBy?.roleId?.name || null,
    isCancelled: false,
    isRetendered: false,
  }
}

// Loads the authenticated user with role + department populated. Every
// handler below needs this to know which branch of the role rules applies.
async function loadCurrentUser(req) {
  const currentUser = req.user
  if (!currentUser) return null
  return User.findById(currentUser._id || currentUser.id)
    .populate('roleId')
    .populate('departmentId')
}

// Finds the active department_head user for a given department — the
// target of "Send to Head".
async function resolveHeadForDepartment(departmentId) {
  const headRole = await Role.findOne({ name: 'department_head', isActive: true })
  if (!headRole || !departmentId) return null
  return User.findOne({
    roleId: headRole._id,
    departmentId,
    status: 'Active',
    isDeleted: false,
  })
}

// Finds an active administrator user — the target of "Send to Administrator".
// Administrators aren't department-scoped (departmentId is null on their
// user record), so this isn't filtered by department.
async function resolveAdministrator() {
  const adminRole = await Role.findOne({ name: 'administrator', isActive: true })
  if (!adminRole) return null
  return User.findOne({
    roleId: adminRole._id,
    status: 'Active',
    isDeleted: false,
  })
}

// ── GET /api/create-tenders/meta/form ─────────────────────────────────────
// The create/edit form needs real ObjectIds for categoryId/districtId
// (not display names), plus the current user's own department (read-only
// on the form, always derived from the logged-in user — never submitted
// by the client). Kept as a separate lightweight endpoint rather than
// bloating getTenders/getTenderById.
exports.getFormMeta = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const [categories, districts] = await Promise.all([
      Category.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
      District.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
    ])

    return res.status(200).json({
      success: true,
      data: {
        department: {
          id: (me.departmentId?._id || me.departmentId)?.toString() || null,
          name: me.departmentId?.name || null,
        },
        categories: categories.map((c) => ({ id: c._id.toString(), name: c.name })),
        districts: districts.map((d) => ({ id: d._id.toString(), name: d.name })),
      },
    })
  } catch (err) {
    console.error('getFormMeta error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/create-tenders ─────────────────────────────────────────────
exports.getTenders = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const roleName = me.roleId?.name
    const myDepartmentId = me.departmentId?._id || me.departmentId
    const baseQuery = { isDeleted: false }

    let tenders

    if (roleName === 'department_employee') {
      // ONLY this employee's own Draft tenders — not other employees'
      // drafts in the same department, and not any other department's.
      // Security requirement: an employee must never see tenders created
      // by anyone else, regardless of department.
      baseQuery.departmentId = myDepartmentId
      baseQuery.createdBy = me._id
      baseQuery.status = 'Draft'

      tenders = await CreateTender.find(baseQuery)
        .populate('departmentId', 'name code')
        .populate('categoryId', 'name')
        .populate('districtId', 'name')
        .populate({
          path: 'createdBy',
          select: 'fullName email roleId',
          populate: { path: 'roleId', select: 'name' },
        })
        .sort({ updatedAt: -1 })
        .lean()
    } else if (roleName === 'department_head') {
      // ONLY this head's own Draft tenders. Explicitly status: 'Draft' —
      // this excludes 'Sent to Head' tenders on purpose, per the rule that
      // this list is not the approval queue.
      baseQuery.departmentId = myDepartmentId
      baseQuery.createdBy = me._id
      baseQuery.status = 'Draft'

      tenders = await CreateTender.find(baseQuery)
        .populate('departmentId', 'name code')
        .populate('categoryId', 'name')
        .populate('districtId', 'name')
        .populate({
          path: 'createdBy',
          select: 'fullName email roleId',
          populate: { path: 'roleId', select: 'name' },
        })
        .sort({ updatedAt: -1 })
        .lean()
    } else {
      // administrator / financial / tender_authority / anything else -> everything
      tenders = await CreateTender.find(baseQuery)
        .populate('departmentId', 'name code')
        .populate('categoryId', 'name')
        .populate('districtId', 'name')
        .populate({
          path: 'createdBy',
          select: 'fullName email roleId',
          populate: { path: 'roleId', select: 'name' },
        })
        .sort({ updatedAt: -1 })
        .lean()
    }

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
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    const roleName = me.roleId?.name

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: false })
      .populate('departmentId', 'name code')
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

    if (roleName === 'department_employee' || roleName === 'department_head' || roleName === 'administrator') {
      const isOwner = tender.createdBy._id.toString() === me._id.toString()
      const isHeadReview =
        roleName === 'department_head' &&
        tender.status === 'Sent to Head' &&
        tender.sentTo &&
        tender.sentTo.toString() === me._id.toString()
      const isAdminReview =
        roleName === 'administrator' &&
        tender.status === 'Sent to Administrator' &&
        tender.sentTo &&
        tender.sentTo.toString() === me._id.toString()

      if (!isOwner && !isHeadReview && !isAdminReview) {
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
// New tenders always start as Draft, regardless of who creates them.
exports.createTender = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

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
      tenderId,
    } = req.body

    if (!title || !categoryId || !districtId || !estimatedValue) {
      return res.status(400).json({
        success: false,
        message: 'title, categoryId, districtId and estimatedValue are required',
      })
    }

    const tender = await CreateTender.create({
      tenderId,
      title,
      description,
      departmentId: me.departmentId?._id || me.departmentId,
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
      status: 'Draft', // always starts as Draft
    })

    return res.status(201).json({ success: true, data: tender })
  } catch (err) {
    console.error('createTender error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PUT /api/create-tenders/:id  ("Save") ─────────────────────────────────
// Two distinct authorized edit paths:
//
// 1. OWNER DRAFT EDIT — the creator (department_employee OR department_head)
//    editing their own tender while it's still 'Draft'. Status never moves
//    forward here; it's explicitly re-set to 'Draft' (a no-op in this case).
//
// 2. HEAD REVIEW EDIT — a department_head editing a tender that ISN'T
//    theirs, but was routed to them for approval: status is currently
//    'Sent to Head' AND sentTo === this head's own _id. In this path the
//    status is left completely untouched — the head is correcting details
//    before deciding to approve/reject/forward, not restarting the workflow.
//
// Any other combination (wrong owner, wrong status, wrong reviewer) is
// rejected.
exports.updateTender = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    const roleName = me.roleId?.name

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const isOwner = tender.createdBy.toString() === me._id.toString()
    const isOwnerDraftEdit = isOwner && tender.status === 'Draft'

    const isHeadReviewEdit =
      roleName === 'department_head' &&
      tender.status === 'Sent to Head' &&
      tender.sentTo &&
      tender.sentTo.toString() === me._id.toString()

    const isAdminReviewEdit =
      roleName === 'administrator' &&
      tender.status === 'Sent to Administrator' &&
      tender.sentTo &&
      tender.sentTo.toString() === me._id.toString()

    if (!isOwnerDraftEdit && !isHeadReviewEdit && !isAdminReviewEdit) {
      if (!isOwner && !isHeadReviewEdit && !isAdminReviewEdit) {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this tender' })
      }
      // isOwner is true but status isn't Draft, and it's not a valid
      // head/admin review edit either -> already sent onward, can't
      // silently edit it.
      return res.status(409).json({
        success: false,
        message: `This tender has already been sent (status: "${tender.status}") and can no longer be edited.`,
      })
    }

    const allowedFields = [
      'title', 'description', 'categoryId', 'districtId', 'location', 'taluk',
      'village', 'latitude', 'longitude', 'estimatedValue', 'currency',
      'duration', 'startDate', 'closingDate', 'tenderType', 'priority',
      'image', 'documentUrl',
      // NOTE: 'status' and 'sentTo' are intentionally NOT in this list —
      // Save/edit can never change them directly; only the send-to-* /
      // approve / reject actions can.
    ]

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) tender[field] = req.body[field]
    })

    if (isOwnerDraftEdit) {
      tender.status = 'Draft' // explicit, even though it's already Draft
    }
    // isHeadReviewEdit / isAdminReviewEdit: status is deliberately left
    // untouched — stays 'Sent to Head' / 'Sent to Administrator' so the
    // reviewer can still act on it (approve/reject/forward) afterward.
    tender.updatedBy = me._id
    await tender.save()

    return res.status(200).json({ success: true, data: tender })
  } catch (err) {
    console.error('updateTender error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/create-tenders/:id/send-to-head ───────────────────────────
// department_employee only. Transitions Draft -> 'Sent to Head', and sets
// sentTo to the department_head user in the SAME department as the
// employee/tender.
exports.sendToHead = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const roleName = me.roleId?.name
    if (roleName !== 'department_employee') {
      return res.status(403).json({
        success: false,
        message: 'Only a department employee can send a tender to the department head.',
      })
    }

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }
    if (tender.createdBy.toString() !== me._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to send this tender.' })
    }
    if (tender.status !== 'Draft') {
      return res.status(409).json({
        success: false,
        message: `This tender is already "${tender.status}" and cannot be sent again.`,
      })
    }

    const departmentId = me.departmentId?._id || me.departmentId
    const head = await resolveHeadForDepartment(departmentId)
    if (!head) {
      return res.status(422).json({
        success: false,
        message: 'No active department head is configured for your department. Contact your administrator.',
      })
    }

    tender.status = 'Sent to Head'
    tender.sentTo = head._id
    tender.updatedBy = me._id
    await tender.save()

    return res.status(200).json({ success: true, data: tender })
  } catch (err) {
    console.error('sendToHead error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/create-tenders/:id/send-to-administrator ──────────────────
// department_head only. Transitions Sent to Head -> 'Sent to Administrator',
// and sets sentTo to an active administrator user. This is the head's own
// forward action — separate from the Approvement page's approve/reject.
exports.sendToAdministrator = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const roleName = me.roleId?.name
    if (roleName !== 'department_head') {
      return res.status(403).json({
        success: false,
        message: 'Only a department head can send a tender to the administrator.',
      })
    }

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const isOwnDraft = tender.createdBy.toString() === me._id.toString() && tender.status === 'Draft'
    const isReceivedForReview =
      tender.status === 'Sent to Head' &&
      tender.sentTo &&
      tender.sentTo.toString() === me._id.toString()

    if (!isOwnDraft && !isReceivedForReview) {
      return res.status(403).json({ success: false, message: 'Not authorized to send this tender.' })
    }

    const admin = await resolveAdministrator()
    if (!admin) {
      return res.status(422).json({
        success: false,
        message: 'No active administrator account is configured. Contact system support.',
      })
    }

    tender.status = 'Sent to Administrator'
    tender.sentTo = admin._id
    tender.updatedBy = me._id
    await tender.save()

    return res.status(200).json({ success: true, data: tender })
  } catch (err) {
    console.error('sendToAdministrator error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── DELETE /api/create-tenders/:id  (soft delete) ─────────────────────────
exports.deleteTender = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

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