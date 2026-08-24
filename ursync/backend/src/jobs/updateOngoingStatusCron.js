// src/jobs/updateOngoingStatusCron.js
//
// Registers a recurring background job that flips a Tender's status to
// 'Ongoing' once its closingDate is still in the future, with no dependency
// on any page being opened or any API request coming in — it runs purely
// on Node's internal timer for as long as this process is alive.
//
// Only tenders whose status is NOT already 'Ongoing' are touched, so
// already-Ongoing tenders are left untouched (no unnecessary writes).
//
// Called once from server.js, after the DB is connected and app.listen()
// has started:
//   startOngoingStatusCron()

const cron = require('node-cron')
const Tender = require('../models/Tender')

// Schedule: once a day at midnight. Adjust as needed:
//   '*/5 * * * *'  -> every 5 minutes
//   '0 * * * *'    -> every hour on the hour
//   '0 0 * * *'    -> once a day at midnight (current)
const CRON_SCHEDULE = '0 0 * * *'

function runSync(label) {
  const now = new Date()

  Tender.updateMany(
    {
      isDeleted: false,
      closingDate: { $gt: now },
      status: { $ne: 'Ongoing' },
    },
    { $set: { status: 'Ongoing' } }
  )
    .then((result) => {
      console.log(
        `[updateOngoingStatusCron] ${label} sync completed at ${now.toISOString()} ` +
          `(matched=${result.matchedCount}, modified=${result.modifiedCount})`
      )
    })
    .catch((err) => {
      console.error(`[updateOngoingStatusCron] ${label} sync failed:`, err)
    })
}

function startOngoingStatusCron() {
  // Run once immediately on startup — catches up anything that should have
  // flipped while the server was down (deploy, crash, restart), instead of
  // leaving it stale until the first scheduled tick.
  runSync('initial')

  // Then keep running on the recurring schedule for the lifetime of the process.
  cron.schedule(CRON_SCHEDULE, () => runSync('scheduled'))

  console.log(`[updateOngoingStatusCron] scheduled to run every ${CRON_SCHEDULE}`)
}

module.exports = startOngoingStatusCron