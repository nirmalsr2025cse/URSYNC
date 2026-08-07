// src/jobs/cleanupTempApplications.js
//
// Runs on a schedule (wire into node-cron or your existing scheduler — see
// bottom of file). For every application entry that is:
//   - still unpaid (isPaid: false), AND
//   - applicationTime older than 48 hours
// this will:
//   1. Delete every GridFS file it owns (documents[].fileId + signatureFileId)
//      → removes matching docs from BOTH bidderDocuments.files and
//        bidderDocuments.chunks automatically (GridFS handles the chunk
//        cleanup internally when you call bucket.delete).
//   2. Delete the matching entry from the "biddereslists" collection
//      (adjust the import in models/BiddersList.js to your real schema).
//   3. Pull the application entry out of tempbidderapplications.
//   4. If a tempbidderapplications document ends up with an empty
//      `applications` array, delete the whole parent document too, so the
//      collection doesn't accumulate empty shells over time.

const mongoose = require('mongoose')
const TempBidderApplication = require('../models/TempBidderApplication')
const BiddersList = require('../models/BiddersList')
const { deleteGridFSFileSafe } = require('../config/gridfs')

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

async function deleteGridFSFilesForEntry(entry) {
  const deletions = []
  ;(entry.documents || []).forEach((doc) => {
    if (doc.fileId) deletions.push(new Promise((resolve) => deleteGridFSFileSafe(doc.fileId) || resolve()))
  })
  if (entry.signatureFileId) {
    deletions.push(new Promise((resolve) => deleteGridFSFileSafe(entry.signatureFileId) || resolve()))
  }
  // deleteGridFSFileSafe is fire-and-forget internally (callback-based);
  // we don't strictly need to await it, but this keeps a hook point if you
  // later want to switch to promise-based bucket.delete with await.
  await Promise.all(deletions)
}

async function cleanupExpiredTempApplications() {
  const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS)
  let removedCount = 0

  const cursor = TempBidderApplication.find({
    'applications.isPaid': false,
    'applications.applicationTime': { $lt: cutoff },
  }).cursor()

  for await (const tempDoc of cursor) {
    const expiredEntries = tempDoc.applications.filter(
      (a) => !a.isPaid && a.applicationTime && a.applicationTime < cutoff
    )
    if (!expiredEntries.length) continue

    for (const entry of expiredEntries) {
      // 1. Delete files from GridFS (bidderDocuments.files + .chunks)
      await deleteGridFSFilesForEntry(entry)

      // 2. Delete the matching row from the permanent bidderslist collection,
      //    if the bidder never completed/paid for their application.
      try {
        await BiddersList.deleteOne({
          tenderId: tempDoc.tenderId,
          userId: entry.userId,
        })
      } catch (err) {
        console.warn('[cleanup] BiddersList delete warning:', err.message)
      }

      removedCount += 1
    }

    // 3. Pull the expired entries out of this temp application document.
    tempDoc.applications = tempDoc.applications.filter(
      (a) => !(!a.isPaid && a.applicationTime && a.applicationTime < cutoff)
    )

    // 4. If nothing is left, delete the parent document entirely;
    //    otherwise save the trimmed applications array.
    if (tempDoc.applications.length === 0) {
      await TempBidderApplication.deleteOne({ _id: tempDoc._id })
    } else {
      await tempDoc.save()
    }
  }

  console.log(`[cleanup] Removed ${removedCount} expired unpaid application(s) at ${new Date().toISOString()}`)
  return removedCount
}

module.exports = { cleanupExpiredTempApplications }

// ── Wiring example (add to your server bootstrap, e.g. src/server.js) ────
// const cron = require('node-cron')
// const { cleanupExpiredTempApplications } = require('./jobs/cleanupTempApplications')
//
// // Runs every hour on the hour; each run only touches entries that have
// // actually crossed the 48h mark, so an hourly cadence is plenty granular.
// cron.schedule('0 * * * *', () => {
//   cleanupExpiredTempApplications().catch((err) =>
//     console.error('[cleanup] job failed:', err)
//   )
// })