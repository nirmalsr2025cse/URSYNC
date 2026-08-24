// src/jobs/applicationStatusCron.js
//
// Registers a recurring background job that keeps Tender.application
// ('Upcoming' / 'Open' / 'Completed') correct as real time passes, with no
// dependency on any page being opened or any API request coming in.
//
// This job does NOT contain its own date-comparison logic — it just calls
// Tender.syncApplicationStatuses() (defined in src/models/Tender.js),
// which is the single source of truth for this state machine:
//
//   now >= applicationEndDate    -> application = 'Completed'
//   now >= applicationStartDate  -> application = 'Open'
//   otherwise                    -> application = 'Upcoming'
//
// Keeping the logic in one place (the model) means this cron and any
// direct .save() call (which runs the model's pre-save hook) can never
// drift apart or disagree with each other.
//
// Called once from server.js, after the DB is connected and app.listen()
// has started:
//   startApplicationStatusCron()

const cron = require('node-cron')
const Tender = require('../models/Tender')

const CRON_SCHEDULE = '0 0 * * *'

async function runSync(label) {
  const now = new Date()
  try {
    await Tender.syncApplicationStatuses()
    console.log(`[applicationStatusCron] ${label} sync completed at ${now.toISOString()}`)
  } catch (err) {
    console.error(`[applicationStatusCron] ${label} sync failed:`, err)
  }
}

function startApplicationStatusCron() {
  runSync('initial')
  cron.schedule(CRON_SCHEDULE, () => runSync('scheduled'))
  console.log(`[applicationStatusCron] scheduled to run every ${CRON_SCHEDULE}`)
}

module.exports = startApplicationStatusCron