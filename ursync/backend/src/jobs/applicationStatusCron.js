// src/jobs/applicationStatusCron.js
//
// Registers a recurring background job that keeps Tender.application
// ('Upcoming' / 'Open' / 'Completed') correct as real time passes, with no
// dependency on any page being opened or any API request coming in — it
// runs purely on Node's internal timer for as long as this process is alive.
//
// Runs against the `tenders` collection (Tender model) — every document
// there only exists because a Tender Authority already approved it, so
// there's no separate status filter needed the way CreateTender needed
// { status: 'Approved' }.
//
// Called once from server.js, after the DB is connected and app.listen()
// has started:
//   startApplicationStatusCron()

const cron = require('node-cron')
const Tender = require('../models/Tender')

// Schedule: every 1 minute. Adjust as needed:
//   '*/5 * * * *'  -> every 5 minutes
//   '0 * * * *'    -> every hour on the hour
//   '*/1 * * * *'  -> every 1 minute (current)
const CRON_SCHEDULE = '0 0 * * *'

function runSync(label) {
  Tender.syncApplicationStatuses()
    .then(() => {
      console.log(`[applicationStatusCron] ${label} sync completed at ${new Date().toISOString()}`)
    })
    .catch((err) => {
      console.error(`[applicationStatusCron] ${label} sync failed:`, err)
    })
}

function startApplicationStatusCron() {
  // Run once immediately on startup — catches up anything that should have
  // flipped while the server was down (deploy, crash, restart), instead of
  // leaving it stale until the first scheduled tick.
  runSync('initial')

  // Then keep running on the recurring schedule for the lifetime of the process.
  cron.schedule(CRON_SCHEDULE, () => runSync('scheduled'))

  console.log(`[applicationStatusCron] scheduled to run every ${CRON_SCHEDULE}`)
}

module.exports = startApplicationStatusCron