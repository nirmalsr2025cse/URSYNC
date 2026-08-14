// src/services/tenderNotificationService.js
//
// Central place for "who gets emailed at each tender stage" + "who's in the
// approval chain so far". Keeps that logic out of the controllers.
//
// RULES IMPLEMENTED (per requirements):
//
//  - Every intermediate stage (created, sent to head, sent to administrator,
//    sent to financial, sent to tender authority, department_head's own
//    final approval, rejections) emails:
//      -> the tender's creator
//      -> PLUS the department_head of that department, IF the creator is a
//         department_employee (a department_head's own tenders only email
//         the head, since they ARE the head).
//
//  - Every user who acts on the tender (creates it, sends it onward,
//    approves it at any stage) is recorded in tender.approvalChain
//    (see CreateTender model) — an array of { userId, stage, at }.
//
//  - On the FINAL tender_authority approval (the live tender gets
//    published), an email goes out to:
//      -> the creator
//      -> every user recorded in approvalChain (everyone who touched it)
//      -> every active tender_authority user in the users collection
//
// Recipient email address: prefers User.email_to_send (the field seen on
// existing user documents), falling back to User.email if not set.

const User = require('../models/User')
const Role = require('../models/Role')
const { sendMail } = require('./mailService')

function pickEmail(user) {
  if (!user) return null
  return user.email_to_send || user.email || null
}

// Finds the active department_head for a given department.
async function getDepartmentHead(departmentId) {
  if (!departmentId) return null
  const headRole = await Role.findOne({ name: 'department_head', isActive: true }).select('_id').lean()
  if (!headRole) return null
  return User.findOne({
    roleId: headRole._id,
    departmentId,
    status: 'Active',
    isDeleted: false,
  }).select('_id fullName email email_to_send')
}

// Returns all active tender_authority users (system-wide) for the final
// "published" notification.
async function getAllTenderAuthorityUsers() {
  const role = await Role.findOne({ name: 'tender_authority', isActive: true }).select('_id').lean()
  if (!role) return []
  return User.find({ roleId: role._id, status: 'Active', isDeleted: false }).select(
    '_id fullName email email_to_send'
  )
}

// Records that `actorUserId` acted on `tender` at this stage. Mutates the
// in-memory doc — caller is responsible for save()-ing it afterward (or it
// can be called right before a save() that's already happening anyway).
function addToApprovalChain(tender, actorUserId, stageLabel) {
  if (!actorUserId) return
  if (!tender.approvalChain) tender.approvalChain = []

  const alreadyRecorded = tender.approvalChain.some(
    (entry) =>
      entry.userId &&
      entry.userId.toString() === actorUserId.toString() &&
      entry.stage === stageLabel
  )

  if (!alreadyRecorded) {
    tender.approvalChain.push({ userId: actorUserId, stage: stageLabel, at: new Date() })
  }
}

// Builds the "creator (+ department head, if creator is an employee)"
// recipient list used for every intermediate-stage email.
async function baseRecipients(tender, creatorUser) {
  const recipients = new Set()

  const creatorEmail = pickEmail(creatorUser)
  if (creatorEmail) recipients.add(creatorEmail)

  const creatorRoleName = creatorUser?.roleId?.name
  if (creatorRoleName === 'department_employee') {
    const departmentId = tender.departmentId?._id || tender.departmentId
    const head = await getDepartmentHead(departmentId)
    const headEmail = pickEmail(head)
    if (headEmail) recipients.add(headEmail)
  }
  // If the creator IS the department_head, no extra recipient is added —
  // they're already covered by creatorEmail above.

  return [...recipients]
}

/**
 * Sends the "your tender moved to a new stage" email.
 * @param {Object} tender - the CreateTender document (title/tenderId/status used)
 * @param {Object} creatorUser - User doc for tender.createdBy, roleId populated
 * @param {Object} opts
 * @param {string} opts.stageLabel - short label, used only for logging
 * @param {string} opts.subject
 * @param {string} opts.message - one-line human description of what happened
 */
async function notifyStage(tender, creatorUser, { stageLabel, subject, message }) {
  try {
    const recipients = await baseRecipients(tender, creatorUser)
    if (recipients.length === 0) {
      console.warn(`notifyStage(${stageLabel}): no recipients resolved, skipping.`)
      return
    }
    await sendMail({
      to: recipients,
      subject,
      html: `
        <p>${message}</p>
        <p><strong>Tender:</strong> ${tender.title} (${tender.tenderId || ''})</p>
        <p><strong>Current status:</strong> ${tender.status}</p>
      `,
    })
  } catch (err) {
    console.error(`notifyStage(${stageLabel}) failed:`, err)
  }
}

/**
 * Sends the rejection email to the base recipients, including the reason.
 */
async function notifyRejection(tender, creatorUser, reason) {
  try {
    const recipients = await baseRecipients(tender, creatorUser)
    if (recipients.length === 0) return
    await sendMail({
      to: recipients,
      subject: `Tender Rejected: ${tender.title}`,
      html: `
        <p>The tender <strong>${tender.title}</strong> (${tender.tenderId || ''}) was rejected.</p>
        <p><strong>Reason:</strong> ${reason}</p>
      `,
    })
  } catch (err) {
    console.error('notifyRejection failed:', err)
  }
}

/**
 * Sends the final "approved & published" email once the Tender Authority
 * approves — to the creator, everyone in approvalChain, and every active
 * tender_authority user.
 */
async function notifyFinalApproval(tender, creatorUser) {
  try {
    const chainUserIds = (tender.approvalChain || []).map((e) => e.userId).filter(Boolean)

    const chainUsers = chainUserIds.length
      ? await User.find({ _id: { $in: chainUserIds } }).select('email email_to_send')
      : []
    const authorityUsers = await getAllTenderAuthorityUsers()

    const recipients = new Set()
    const creatorEmail = pickEmail(creatorUser)
    if (creatorEmail) recipients.add(creatorEmail)
    chainUsers.forEach((u) => {
      const e = pickEmail(u)
      if (e) recipients.add(e)
    })
    authorityUsers.forEach((u) => {
      const e = pickEmail(u)
      if (e) recipients.add(e)
    })

    if (recipients.size === 0) {
      console.warn('notifyFinalApproval: no recipients resolved, skipping.')
      return
    }

    await sendMail({
      to: [...recipients],
      subject: `Tender Approved & Published: ${tender.title}`,
      html: `
        <p>The tender <strong>${tender.title}</strong> (${tender.tenderId || ''}) has been approved and published.</p>
        <p>This notification was sent to everyone who reviewed or approved this tender, and to all Tender Authority users.</p>
      `,
    })
  } catch (err) {
    console.error('notifyFinalApproval failed:', err)
  }
}

module.exports = {
  addToApprovalChain,
  notifyStage,
  notifyRejection,
  notifyFinalApproval,
  getDepartmentHead,
  getAllTenderAuthorityUsers,
}