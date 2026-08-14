// src/services/mailService.js
//
// Thin wrapper around the Resend API. Every other file that needs to send
// an email should go through sendMail() here rather than calling Resend
// directly, so retry/error-handling/logging only lives in one place.
//
// ENV VARS REQUIRED (see .env.example):
//   RESEND_API_KEY  - from https://resend.com/api-keys
//   MAIL_FROM       - a verified sender, e.g. "Tender Portal <notifications@yourdomain.com>"
//
// INSTALL:
//   npm install resend --save

const { Resend } = require('resend')

if (!process.env.RESEND_API_KEY) {
  console.warn('mailService: RESEND_API_KEY is not set — emails will fail to send.')
}

const resend = new Resend(process.env.RESEND_API_KEY)
const DEFAULT_FROM = process.env.MAIL_FROM || 'Tender Portal <onboarding@resend.dev>'

/**
 * Sends an email via Resend.
 * @param {Object} opts
 * @param {string|string[]} opts.to - one email or an array of emails
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.from] - overrides DEFAULT_FROM if provided
 * @returns {Promise<Object|null>} the Resend result, or null if nothing was sent
 */
async function sendMail({ to, subject, html, from }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)

  if (recipients.length === 0) {
    console.warn('mailService.sendMail: no valid recipients, skipping send. Subject:', subject)
    return null
  }

  try {
    const result = await resend.emails.send({
      from: from || DEFAULT_FROM,
      to: recipients,
      subject,
      html,
    })

    if (result?.error) {
      console.error('mailService.sendMail: Resend returned an error:', result.error)
    }

    return result
  } catch (err) {
    // Mail failures should never break the request/response flow of the
    // controller that triggered them — log and swallow.
    console.error('mailService.sendMail: failed to send email:', err)
    return null
  }
}

module.exports = { sendMail }