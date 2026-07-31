// scripts/backfillUserAccountFields.js
// One-time migration: sets accountType/panNumber/isDebarment on any User
// document that predates these fields (e.g. admin/department accounts
// created before the Debarment List feature was added).
//
// Run once with: node scripts/backfillUserAccountFields.js
//
// Safe to re-run — only touches documents where the field is missing
// entirely ($exists: false), never overwrites an already-set value.

const mongoose = require('mongoose')
const User = require('../src/models/User')

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/URSYNC')

  const results = await Promise.all([
    User.updateMany(
      { accountType: { $exists: false } },
      { $set: { accountType: 'Individual' } }
    ),
    User.updateMany(
      { panNumber: { $exists: false } },
      { $set: { panNumber: null } }
    ),
    User.updateMany(
      { isDebarment: { $exists: false } },
      { $set: { isDebarment: false } }
    ),
  ])

  console.log('accountType backfilled:', results[0].modifiedCount)
  console.log('panNumber backfilled:', results[1].modifiedCount)
  console.log('isDebarment backfilled:', results[2].modifiedCount)

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})