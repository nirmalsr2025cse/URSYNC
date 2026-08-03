// src/jobs/cleanupTempApplications.js
//
// Deletes any UNPAID application entry whose applicationTime is older than
// 48 hours, along with its uploaded temp files. If a tender's applications
// array becomes empty after cleanup, the whole TempBidderApplication doc is
// removed too.
//
// Wire this up once in server.js, e.g.:
//   const cron = require('node-cron')
//   const cleanupTempApplications = require('./jobs/cleanupTempApplications')
//   cron.schedule('0 * * * *', cleanupTempApplications) // every hour
//
// (npm install node-cron)

const fs = require('fs')
const TempBidderApplication = require('../models/TempBidderApplication')

const EXPIRY_MS = 48 * 60 * 60 * 1000 // 48 hours

module.exports = async function cleanupTempApplications() {
  try {
    const cutoff = new Date(Date.now() - EXPIRY_MS)

    const docs = await TempBidderApplication.find({
      'applications.isPaid': false,
      'applications.applicationTime': { $lt: cutoff },
    })

    for (const doc of docs) {
      const keep = []
      for (const entry of doc.applications) {
        const expired = !entry.isPaid && entry.applicationTime < cutoff
        if (!expired) {
          keep.push(entry)
          continue
        }
        // Delete this entry's temp files from disk.
        entry.documents.forEach((d) => deleteFileSafe(d.filePath))
        deleteFileSafe(entry.signatureFilePath)
      }

      if (keep.length === 0) {
        await TempBidderApplication.deleteOne({ _id: doc._id })
      } else if (keep.length !== doc.applications.length) {
        doc.applications = keep
        await doc.save()
      }
    }

    if (docs.length) {
      console.log(`[cleanupTempApplications] processed ${docs.length} tender(s) with expired entries`)
    }
  } catch (err) {
    console.error('[cleanupTempApplications] failed:', err)
  }
}

function deleteFileSafe(filePath) {
  if (!filePath) return
  fs.unlink(filePath, () => {})
}