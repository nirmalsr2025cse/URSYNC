// src/controllers/approvementController.js
//
// Tenders-only (Bidders intentionally NOT covered here — still frontend
// mock data per requirements).
//
// Visibility rules:
//
// department_head:
//   - Sees ONLY tenders with status 'Sent to Head'
//   - AND sentTo === this head's own _id (the tender must have actually
//     been routed to THEM specifically, not just any head)
//   - AND departmentId === this head's own department (defence in depth —
//     sentTo already implies this, but we don't rely on that alone)
//
// administrator:
//   - Sees ONLY tenders with status 'Sent to Administrator'
//   - AND sentTo === this administrator's own _id
//   - No department restriction — administrators aren't department-scoped
//
// Approve / Reject:
//   - department_head can only approve/reject a tender that is currently
//     'Sent to Head' AND addressed to them.
//   - administrator can only approve/reject a tender that is currently
//     'Sent to Administrator' AND addressed to them.
//   - Approve -> department_head: status 'Approved' (final, own action).
//     Approve -> administrator: status 'Sent to Financial' (forward action).
//   - Reject -> status 'Rejected'.
//
// ── EMAIL NOTIFICATIONS ────────────────────────────────────────────────
// approveTender() -> records the acting user (head or administrator) in
//   tender.approvalChain, then emails the base recipients (creator, + the
//   department head if the creator is a department_employee) about the
//   new stage.
// rejectTender()  -> emails the base recipients with the rejection reason.
// See src/services/tenderNotificationService.js for the recipient rules,
// and notifyFinalApproval() (fired later, at Tender Authority stage) for
// the "everyone who touched this tender" final email.

const CreateTender = require('../models/CreateTender')
const User = require('../models/User')
const Rejection = require('../models/Rejection')
const Role = require('../models/Role')
const formatCurrency = require('../utils/formatCurrency')
const {
  addToApprovalChain,
  notifyStage,
  notifyRejection,
} = require('../services/tenderNotificationService')

const NOT_DELETED = { $ne: true }

async function loadCurrentUser(req) {
  const currentUser = req.user
  if (!currentUser) return null
  return User.findById(currentUser._id || currentUser.id)
    .populate('roleId')
    .populate('departmentId')
}

// Loads the tender's creator with roleId populated — required by
// tenderNotificationService.baseRecipients() to decide whether to also CC
// the department head (only applies if the creator is a
// department_employee).
async function loadCreatorWithRole(createdBy) {
  if (!createdBy) return null
  return User.findById(createdBy).populate('roleId')
}

// Finds an active financial-department user — the target of the
// administrator's "Approve" action, which forwards the tender onward
// rather than finalizing it. Financial users aren't department-scoped
// (mirrors resolveAdministrator's pattern in createTenderController.js).
async function resolveFinancialUser() {
  const financialRole = await Role.findOne({ name: 'financial', isActive: true })
  if (!financialRole) return null
  return User.findOne({
    roleId: financialRole._id,
    status: 'Active',
    isDeleted: false,
  })
}

// Shaped to match tenderController.js's toCardShape() exactly, since
// TenderView.jsx was built against that shape — plus a handful of
// Approvement-only fields (recordId, sentTo, priority) the queue itself
// needs. Missing any of the TenderView fields here means the "View"
// button opens a page with blank/dashed-out sections instead of an error,
// so keep this in sync with toCardShape() if that one ever changes.
function formatApprovementTender(t) {
  return {
    // recordId is the real Mongo _id — required for approve/reject calls.
    recordId: t._id.toString(),
    // tenderId is the human-facing code (e.g. "TN/PWD/2026/001") —
    // TenderView.jsx reads tender.tenderId directly for its header/ID row.
    tenderId: t.tenderId,
    id: t.tenderId, // kept for any code still reading `id` as the display code
    title: t.title,
    projectName: t.title, // Approvement's own cards read tender.projectName
    description: t.description || '',
    image: t.image || '',
    documentUrl: t.documentUrl || null,
    department: t.departmentId?.name || '—',
    departmentCode: t.departmentId?.code || '—',
    organization: t.departmentId?.organization || t.departmentId?.name || '—',
    category: t.categoryId?.name || '—',
    categoryId: t.categoryId?._id?.toString() || null,
    tenderType: t.tenderType || 'Open',
    district: t.districtId?.name || '—', // Approvement's own cards read tender.district
    districtId: t.districtId?._id?.toString() || null,
    location: t.location || (t.districtId ? t.districtId.name : ''),
    taluk: t.taluk || '',
    village: t.village || '',
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    duration: t.duration || '',
    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,
    amount: t.estimatedValue, // Approvement's own cards read tender.amount
    currency: t.currency || 'INR',
    startDate: t.startDate,
    closingDate: t.closingDate,
    endDate: t.closingDate, // Approvement's own cards read tender.endDate
    status: t.status,
    isRejected: t.isRejected || false,
    priority: t.priority || 'Low',
    lastUpdated: t.updatedAt,
    sentTo: t.sentTo ? t.sentTo.toString() : null,
    isCancelled: false,
    isRetendered: false,
    cancelledReason: null,
  }
}

// ── GET /api/approvement/tenders ────────────────────────────────────────────
exports.getApprovementTenders = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const roleName = me.roleId?.name
    const query = { isDeleted: NOT_DELETED }

    if (roleName === 'department_head') {
      const myDepartmentId = me.departmentId?._id || me.departmentId
      query.status = 'Sent to Head'
      query.sentTo = me._id
      if (myDepartmentId) query.departmentId = myDepartmentId
    } else if (roleName === 'administrator') {
      query.status = 'Sent to Administrator'
      query.sentTo = me._id
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only a department head or administrator can view the approvement queue.',
      })
    }

    const tenders = await CreateTender.find(query)
      .populate('departmentId', 'name code')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .sort({ updatedAt: -1 })
      .lean()

    const data = tenders.map(formatApprovementTender)

    return res.status(200).json({ success: true, count: data.length, data })
  } catch (err) {
    console.error('getApprovementTenders error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/approvement/tenders/:id/approve ──────────────────────────────
// department_head approving -> status 'Approved' (final).
// administrator approving -> status 'Sent to Financial', sentTo set to an
// active financial-department user — this is a forward action, not a
// final approval. The Financial Department reviews it from there.
//
// Either way, the acting user is recorded in tender.approvalChain, and a
// "stage changed" email goes out to the base recipients (creator, + the
// department head if the creator is a department_employee).
exports.approveTender = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const roleName = me.roleId?.name
    if (roleName !== 'department_head' && roleName !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Only a department head or administrator can approve tenders.',
      })
    }

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: NOT_DELETED })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const expectedStatus = roleName === 'department_head' ? 'Sent to Head' : 'Sent to Administrator'
    if (tender.status !== expectedStatus) {
      return res.status(409).json({
        success: false,
        message: `This tender is not currently "${expectedStatus}" and cannot be actioned by you.`,
      })
    }
    if (!tender.sentTo || tender.sentTo.toString() !== me._id.toString()) {
      return res.status(403).json({ success: false, message: 'This tender was not sent to you.' })
    }

    let stageLabel
    let notifySubject
    let notifyMessage

    if (roleName === 'administrator') {
      const financialUser = await resolveFinancialUser()
      if (!financialUser) {
        return res.status(422).json({
          success: false,
          message: 'No active financial department account is configured. Contact system support.',
        })
      }
      tender.status = 'Sent to Financial'
      tender.sentTo = financialUser._id
      stageLabel = 'Administrator Approved'
      notifySubject = `Tender Sent to Financial: ${tender.title}`
      notifyMessage = 'This tender has been reviewed by the administrator and sent to Financial.'
    } else {
      tender.status = 'Approved'
      stageLabel = 'Head Approved'
      notifySubject = `Tender Approved by Head: ${tender.title}`
      notifyMessage = 'This tender has been approved by the department head.'
    }

    // ── notification: record this approval in the chain ─────────────────
    addToApprovalChain(tender, me._id, stageLabel)

    tender.updatedBy = me._id
    await tender.save()

    const creatorUser = await loadCreatorWithRole(tender.createdBy)
    notifyStage(tender, creatorUser, {
      stageLabel,
      subject: notifySubject,
      message: notifyMessage,
    })

    return res.status(200).json({ success: true, data: tender })
  } catch (err) {
    console.error('approveTender error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── PATCH /api/approvement/tenders/:id/reject ───────────────────────────────
// Requires a `reason` in the request body — this is not optional. On
// success: the tender's status becomes 'Rejected', isRejected is set true,
// a document is written to the `rejections` collection recording who
// rejected it, from which department, and why, and a rejection email goes
// out to the base recipients (creator, + department head if applicable).
exports.rejectTender = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const roleName = me.roleId?.name
    if (roleName !== 'department_head' && roleName !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Only a department head or administrator can reject tenders.',
      })
    }

    const reason = String(req.body?.reason || '').trim()
    if (!reason) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required.' })
    }

    const tender = await CreateTender.findOne({ _id: req.params.id, isDeleted: NOT_DELETED })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    const expectedStatus = roleName === 'department_head' ? 'Sent to Head' : 'Sent to Administrator'
    if (tender.status !== expectedStatus) {
      return res.status(409).json({
        success: false,
        message: `This tender is not currently "${expectedStatus}" and cannot be actioned by you.`,
      })
    }
    if (!tender.sentTo || tender.sentTo.toString() !== me._id.toString()) {
      return res.status(403).json({ success: false, message: 'This tender was not sent to you.' })
    }

    tender.status = 'Rejected'
    tender.isRejected = true
    tender.updatedBy = me._id
    await tender.save()

    await Rejection.create({
      tenderId: tender._id,
      departmentId: tender.departmentId,
      cancelledBy: me._id,
      cancelledByRole: me.roleId?.displayName || roleName,
      Reason: reason,
      RejectedDate: new Date(),
    })

    // ── notification: rejection email ───────────────────────────────────
    const creatorUser = await loadCreatorWithRole(tender.createdBy)
    notifyRejection(tender, creatorUser, reason)

    return res.status(200).json({ success: true, data: tender })
  } catch (err) {
    console.error('rejectTender error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}