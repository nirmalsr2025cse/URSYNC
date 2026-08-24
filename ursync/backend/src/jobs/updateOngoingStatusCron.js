// src/jobs/updateOngoingStatusCron.js
//
// Registers a recurring background job that flips a Tender's status to
// 'Ongoing' once its closingDate has arrived (closingDate <= currentDate),
// with no dependency on any page being opened or any API request coming in
// — it runs purely on Node's internal timer for as long as this process is
// alive.
//
// "currentDate" is not a stored field — it's just `new Date()` at the
// moment the job runs, compared against the closingDate that's already on
// the document.
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
      closingDate: { $lte: now },
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
  runSync('initial')
  cron.schedule(CRON_SCHEDULE, () => runSync('scheduled'))
  console.log(`[updateOngoingStatusCron] scheduled to run every ${CRON_SCHEDULE}`)
}

module.exports = startOngoingStatusCron