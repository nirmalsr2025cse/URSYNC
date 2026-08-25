// src/services/applicantNotificationService.js
//
// Applicant-facing emails — separate from tenderNotificationService.js
// (which handles internal approval-chain emails for tender staff). This
// file covers FIVE bidder-facing notifications, split across the two
// points in the flow where a human reviewer takes an action:
//
//   STAGE 1 — department_head, per-applicant document review
//   (applicationApplicantsController.approveApplicant / rejectApplicant):
//     1. notifyApplicationSubmitted — sent the moment a bidder's
//        application lands in `bidderlists` (see
//        tempBidderApplicationController.submitApplication).
//     2. notifyDocumentApproved — sent ONLY to the one applicant whose
//        documents were just approved (isDocumentApproved: true).
//     3. notifyDocumentRejected — sent ONLY to the one applicant whose
//        documents were just rejected/un-approved (isDocumentApproved:
//        false). This is a single-applicant action — it never touches
//        any other applicant on the tender.
//
//   STAGE 2 — department_employee/tender_authority, final selection
//   (applicationApplicantsController.sendToDepartment):
//     4. notifySelected    — SUCCESS mail to every applicant copied into
//        `finalbidders`.
//     5. notifyNotSelected — REJECTION mail to every applicant left
//        behind in `bidderlists` (isDocumentApproved !== true at
//        send-to-department time).
//
// Recipient email resolution: prefers formData.email (what the bidder
// typed into ApplyTenderForm.jsx's Section 1 "Email" field), falling back
// to the User.email_to_send / User.email pattern already used elsewhere
// (see tenderNotificationService.pickEmail). Caller passes both in.
//
// Two different applicants can share the same email address (e.g. the
// same company/user applying is unusual but not impossible, or a shared
// office inbox). Every notify* call is keyed off a single applications[]
// entry (and therefore a single applicationId), so two entries with the
// same email each get their own, separate email — nothing here dedupes
// or merges by address.
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
 * STAGE 1 — sent to a single applicant right after department_head sets
 * their applications[] entry's isDocumentApproved to true
 * (applicationApplicantsController.approveApplicant). This is NOT the
 * final "selected" notice — it only means their documents cleared review
 * and they're now eligible to be carried forward when the tender
 * authority does "Send to Department". Best-effort — does not throw.
 */
async function notifyDocumentApproved(tender, entry) {
  try {
    const to = resolveApplicantEmail(entry)
    if (!to) {
      console.warn('notifyDocumentApproved: no email resolved for applicant, skipping.')
      return
    }
    const name = applicantDisplayName(entry)
    await sendMail({
      to,
      subject: `Documents Approved: ${tender.title}`,
      html: `
        <p>Dear ${name},</p>
        <p>Your submitted documents for the tender <strong>${tender.title}</strong> (${tender.tenderCode || ''}) have been reviewed and approved.</p>
        <p>Your application will now be considered for final bidder selection. You can track its status from your Applied Tenders page.</p>
      `,
    })
  } catch (err) {
    console.error('notifyDocumentApproved failed:', err)
  }
}

/**
 * STAGE 1 — sent to a single applicant right after department_head sets
 * their applications[] entry's isDocumentApproved back to false
 * (applicationApplicantsController.rejectApplicant). This is a
 * single-applicant action: it does not touch, and must never email, any
 * other applicant on the tender. Best-effort — does not throw.
 */
async function notifyDocumentRejected(tender, entry) {
  try {
    const to = resolveApplicantEmail(entry)
    if (!to) {
      console.warn('notifyDocumentRejected: no email resolved for applicant, skipping.')
      return
    }
    const name = applicantDisplayName(entry)
    await sendMail({
      to,
      subject: `Documents Need Attention: ${tender.title}`,
      html: `
        <p>Dear ${name},</p>
        <p>Your submitted documents for the tender <strong>${tender.title}</strong> (${tender.tenderCode || ''}) were reviewed and could not be approved as submitted.</p>
        <p>Your application has been moved back to the pending list. Please check your Applied Tenders page for further details.</p>
      `,
    })
  } catch (err) {
    console.error('notifyDocumentRejected failed:', err)
  }
}

/**
 * STAGE 2 — sent to an applicant whose entry WAS copied into
 * `finalbidders` on "Send to Department". Best-effort — does not throw.
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
 * STAGE 2 — sent to an applicant whose entry was left behind in
 * `bidderlists` (not approved) at the time "Send to Department" ran.
 * Best-effort — does not throw.
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
  notifyDocumentApproved,
  notifyDocumentRejected,
  notifySelected,
  notifyNotSelected,
}