// src/services/applicantNotificationService.js
//
// Applicant-facing emails — separate from tenderNotificationService.js
// (which handles internal approval-chain emails for tender staff). This
// file covers the three bidder-facing notifications:
//
//   1. notifyApplicationSubmitted — sent the moment a bidder's application
//      lands in `bidderlists` (see tempBidderApplicationController.submitApplication).
//   2. notifyFinalSelection       — sent when department_employee/tender_authority
//      runs "Send to Department" (see applicationApplicantsController.sendToDepartment):
//        - SUCCESS mail to every applicant copied into `finalbidders`
//        - REJECTION mail to every applicant left behind in `bidderlists`
//          (isDocumentApproved !== true at send-to-department time)
//
// Recipient email resolution: prefers formData.email (what the bidder
// typed into ApplyTenderForm.jsx's Section 1 "Email" field), falling back
// to the User.email_to_send / User.email pattern already used elsewhere
// (see tenderNotificationService.pickEmail). Caller passes both in.
//
// Mail failures never throw — same swallow-and-log contract as
// mailService.sendMail and tenderNotificationService, so a bad/missing
// email never breaks the request/response flow of the controller that
// triggered it.

const { sendMail } = require('./mailService')

function resolveApplicantEmail(entry, fallbackUser) {
  const fd = entry?.formData || {}
  return (
    fd.email ||
    fallbackUser?.email_to_send ||
    fallbackUser?.email ||
    null
  )
}

function applicantDisplayName(entry, fallbackUser) {
  const fd = entry?.formData || {}
  return fd.applicantName || fd.name || fallbackUser?.fullName || 'Applicant'
}

/**
 * Sent right after a bidder's application is written into `bidderlists`
 * (submitApplication). Best-effort — does not throw.
 * @param {Object} tender - plain object/doc with at least title, tenderCode
 * @param {Object} entry - the applications[] entry just written (has formData)
 * @param {Object} [fallbackUser] - req.user, used only if formData.email is missing
 */
async function notifyApplicationSubmitted(tender, entry, fallbackUser) {
  try {
    const to = resolveApplicantEmail(entry, fallbackUser)
    if (!to) {
      console.warn('notifyApplicationSubmitted: no email resolved for applicant, skipping.')
      return
    }
    const name = applicantDisplayName(entry, fallbackUser)
    await sendMail({
      to,
      subject: `Application Received: ${tender.title}`,
      html: `
        <p>Dear ${name},</p>
        <p>Your application for the tender <strong>${tender.title}</strong> (${tender.tenderCode || ''}) has been received successfully.</p>
        <p>You can track the status of your application from your Applied Tenders page.</p>
      `,
    })
  } catch (err) {
    console.error('notifyApplicationSubmitted failed:', err)
  }
}

/**
 * Sent to an applicant whose entry WAS copied into `finalbidders` on
 * "Send to Department". Best-effort — does not throw.
 */
async function notifySelected(tender, entry) {
  try {
    const to = resolveApplicantEmail(entry)
    if (!to) {
      console.warn('notifySelected: no email resolved for applicant, skipping.')
      return
    }
    const name = applicantDisplayName(entry)
    await sendMail({
      to,
      subject: `Application Selected: ${tender.title}`,
      html: `
        <p>Dear ${name},</p>
        <p>Congratulations! Your application for the tender <strong>${tender.title}</strong> (${tender.tenderCode || ''}) has been selected and forwarded to the department for further processing.</p>
      `,
    })
  } catch (err) {
    console.error('notifySelected failed:', err)
  }
}

/**
 * Sent to an applicant whose entry was left behind in `bidderlists` (not
 * approved) at the time "Send to Department" ran. Best-effort — does not
 * throw.
 */
async function notifyNotSelected(tender, entry) {
  try {
    const to = resolveApplicantEmail(entry)
    if (!to) {
      console.warn('notifyNotSelected: no email resolved for applicant, skipping.')
      return
    }
    const name = applicantDisplayName(entry)
    await sendMail({
      to,
      subject: `Application Update: ${tender.title}`,
      html: `
        <p>Dear ${name},</p>
        <p>Thank you for applying to the tender <strong>${tender.title}</strong> (${tender.tenderCode || ''}).</p>
        <p>Sorry, you have not been selected for the bidding process this time.</p>
      `,
    })
  } catch (err) {
    console.error('notifyNotSelected failed:', err)
  }
}

module.exports = {
  notifyApplicationSubmitted,
  notifySelected,
  notifyNotSelected,
}