// src/services/resourceNotificationService.js
//
// Email notifications for the Resource Sharing module:
//   1. notifyResourceCreated - sends confirmation to creator and the contact email in the form
//   2. notifyResourceRequestApplied - sends confirmation to applicant when applying
//   3. notifyResourceRequestApproved - sends approval email to applicant
//   4. notifyResourceRequestRejected - sends rejection/expiry email to applicant

const User = require('../models/User')
const { sendMail } = require('./mailService')

function pickEmail(user) {
  if (!user) return null
  return user.email_to_send || user.email || null
}

async function resolveUser(userOrId) {
  if (!userOrId) return null
  if (typeof userOrId === 'object' && (userOrId.email || userOrId.email_to_send)) {
    return userOrId
  }
  try {
    return await User.findById(userOrId).select('fullName email email_to_send').lean()
  } catch (err) {
    console.error('resourceNotificationService.resolveUser error:', err)
    return null
  }
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Sent when a resource is created.
 * Sends email to:
 *   1. The user who created the resource (creatorUser)
 *   2. The contact email entered in the Add Resource form (resource.contactPerson.email)
 */
async function notifyResourceCreated(resource, creatorUser) {
  try {
    const creator = await resolveUser(creatorUser)
    const creatorEmail = pickEmail(creator)
    const formContactEmail = resource.contactPerson?.email?.trim() || null

    const resourceName = resource.name || resource.resourceName || 'Resource'
    const resourceId = resource.resourceId || resource._id?.toString() || ''
    const quantity = resource.available ?? resource.quantity ?? 0
    const rent = resource.rentPerDay ? `₹${resource.rentPerDay}/day` : 'Free / As applicable'

    const emailContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1e3a8a; color: #ffffff; padding: 18px 24px;">
          <h2 style="margin: 0; font-size: 20px;">Resource Created Successfully</h2>
        </div>
        <div style="padding: 24px;">
          <p>A new resource has been added to the URSYNC Resource Sharing directory.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #1e3a8a; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><strong>Resource ID:</strong> ${resourceId}</p>
            <p style="margin: 4px 0;"><strong>Resource Name:</strong> ${resourceName}</p>
            <p style="margin: 4px 0;"><strong>Total Quantity Available:</strong> ${quantity}</p>
            <p style="margin: 4px 0;"><strong>Category:</strong> ${resource.category || 'General'}</p>
            <p style="margin: 4px 0;"><strong>Rent Per Day:</strong> ${rent}</p>
            <p style="margin: 4px 0;"><strong>Condition:</strong> ${resource.condition || 'Good'}</p>
            ${resource.contactPerson?.name ? `<p style="margin: 4px 0;"><strong>Contact Person:</strong> ${resource.contactPerson.name} (${resource.contactPerson.phone || ''})</p>` : ''}
          </div>
          <p style="color: #64748b; font-size: 13px;">This resource is now visible in the Resource Sharing portal and available for departmental requests.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 12px; color: #64748b; text-align: center;">
          URSYNC — Resource Sharing Platform
        </div>
      </div>
    `

    const recipients = new Set()
    if (creatorEmail) recipients.add(creatorEmail)
    if (formContactEmail) recipients.add(formContactEmail)

    if (recipients.size === 0) {
      console.warn('notifyResourceCreated: no recipient emails found.')
      return
    }

    for (const recipient of recipients) {
      await sendMail({
        to: recipient,
        subject: `[URSYNC] Resource Created: ${resourceName} (${resourceId})`,
        html: emailContent,
      })
    }
  } catch (err) {
    console.error('notifyResourceCreated failed:', err)
  }
}

/**
 * Sent when a user submits a resource request.
 */
async function notifyResourceRequestApplied(request, applicantUser) {
  try {
    const applicant = await resolveUser(applicantUser || request.requestedBy)
    const to = pickEmail(applicant)
    if (!to) {
      console.warn('notifyResourceRequestApplied: no email found for applicant.')
      return
    }

    const applicantName = applicant.fullName || request.applicantName || 'Applicant'
    const resourceName = request.resourceName || 'Resource'
    const resourceId = request.resourceId || ''
    const quantity = request.requiredQuantity || 1
    const fromDate = formatDate(request.requiredFrom)
    const toDate = formatDate(request.requiredTo)

    await sendMail({
      to,
      subject: `[URSYNC] Resource Request Submitted: ${resourceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0284c7; color: #ffffff; padding: 18px 24px;">
            <h2 style="margin: 0; font-size: 20px;">Resource Request Submitted</h2>
          </div>
          <div style="padding: 24px;">
            <p>Dear ${applicantName},</p>
            <p>Your request for resource sharing has been submitted and is currently <strong>Pending</strong> departmental review.</p>
            <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 4px 0;"><strong>Resource:</strong> ${resourceName} ${resourceId ? `(${resourceId})` : ''}</p>
              <p style="margin: 4px 0;"><strong>Requested Quantity:</strong> ${quantity}</p>
              <p style="margin: 4px 0;"><strong>Required Period:</strong> ${fromDate} to ${toDate}</p>
              <p style="margin: 4px 0;"><strong>Project:</strong> ${request.projectName || '-'} ${request.projectId ? `(${request.projectId})` : ''}</p>
              <p style="margin: 4px 0;"><strong>Purpose:</strong> ${request.purpose || '-'}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #ea580c; font-weight: bold;">Pending Review</span></p>
            </div>
            <p style="color: #64748b; font-size: 13px;">You will receive an email update once your request is reviewed by the department head.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 12px; color: #64748b; text-align: center;">
            URSYNC — Resource Sharing Platform
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('notifyResourceRequestApplied failed:', err)
  }
}

/**
 * Sent when a resource request is Approved.
 */
async function notifyResourceRequestApproved(request, applicantUser, remarks = '') {
  try {
    const applicant = await resolveUser(applicantUser || request.requestedBy)
    const to = pickEmail(applicant)
    if (!to) {
      console.warn('notifyResourceRequestApproved: no email found for applicant.')
      return
    }

    const applicantName = applicant.fullName || request.applicantName || 'Applicant'
    const resourceName = request.resourceName || 'Resource'
    const resourceId = request.resourceId || ''
    const quantity = request.requiredQuantity || 1
    const fromDate = formatDate(request.requiredFrom)
    const toDate = formatDate(request.requiredTo)
    const note = remarks || request.remarks || ''

    await sendMail({
      to,
      subject: `[URSYNC] Resource Request Approved: ${resourceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #16a34a; color: #ffffff; padding: 18px 24px;">
            <h2 style="margin: 0; font-size: 20px;">Resource Request Approved</h2>
          </div>
          <div style="padding: 24px;">
            <p>Dear ${applicantName},</p>
            <p>Good news! Your resource request has been <strong style="color: #16a34a;">Approved</strong>.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 4px 0;"><strong>Resource:</strong> ${resourceName} ${resourceId ? `(${resourceId})` : ''}</p>
              <p style="margin: 4px 0;"><strong>Approved Quantity:</strong> ${quantity}</p>
              <p style="margin: 4px 0;"><strong>Approved Period:</strong> ${fromDate} to ${toDate}</p>
              <p style="margin: 4px 0;"><strong>Project:</strong> ${request.projectName || '-'} ${request.projectId ? `(${request.projectId})` : ''}</p>
              ${note ? `<p style="margin: 4px 0;"><strong>Remarks:</strong> ${note}</p>` : ''}
              <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Approved</span></p>
            </div>
            <p style="color: #64748b; font-size: 13px;">Please coordinate with the resource department for mobilization and handover during the approved period.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 12px; color: #64748b; text-align: center;">
            URSYNC — Resource Sharing Platform
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('notifyResourceRequestApproved failed:', err)
  }
}

/**
 * Sent when a resource request is Rejected (either manually by admin/head or automatically expired).
 */
async function notifyResourceRequestRejected(request, applicantUser, remarks = '', isAutomatic = false) {
  try {
    const applicant = await resolveUser(applicantUser || request.requestedBy)
    const to = pickEmail(applicant)
    if (!to) {
      console.warn('notifyResourceRequestRejected: no email found for applicant.')
      return
    }

    const applicantName = applicant.fullName || request.applicantName || 'Applicant'
    const resourceName = request.resourceName || 'Resource'
    const resourceId = request.resourceId || ''
    const quantity = request.requiredQuantity || 1
    const fromDate = formatDate(request.requiredFrom)
    const toDate = formatDate(request.requiredTo)
    const reason = remarks || request.remarks || (isAutomatic ? 'Request expired before approval.' : 'Request was not approved.')

    await sendMail({
      to,
      subject: `[URSYNC] Resource Request Update: ${resourceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #dc2626; color: #ffffff; padding: 18px 24px;">
            <h2 style="margin: 0; font-size: 20px;">Resource Request ${isAutomatic ? 'Expired / Rejected' : 'Rejected'}</h2>
          </div>
          <div style="padding: 24px;">
            <p>Dear ${applicantName},</p>
            <p>We are writing to update you regarding your resource request for <strong>${resourceName}</strong>.</p>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 4px 0;"><strong>Resource:</strong> ${resourceName} ${resourceId ? `(${resourceId})` : ''}</p>
              <p style="margin: 4px 0;"><strong>Requested Quantity:</strong> ${quantity}</p>
              <p style="margin: 4px 0;"><strong>Requested Period:</strong> ${fromDate} to ${toDate}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">Rejected</span></p>
              <p style="margin: 4px 0;"><strong>Reason / Remarks:</strong> ${reason}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">${isAutomatic ? 'This request reached its required start date before being approved and has been automatically closed.' : 'You may submit a new request or contact the department for further details.'}</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 12px; color: #64748b; text-align: center;">
            URSYNC — Resource Sharing Platform
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('notifyResourceRequestRejected failed:', err)
  }
}

module.exports = {
  notifyResourceCreated,
  notifyResourceRequestApplied,
  notifyResourceRequestApproved,
  notifyResourceRequestRejected,
}
