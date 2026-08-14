// scripts/fixBiddersListIndexes.js
//
// ONE-TIME MIGRATION — run this manually once per environment (local, staging,
// production) that was created before BiddersList.js was migrated from a
// "one application per document" shape to the current "applications[]"
// array shape.
//
// PROBLEM:
// Two indexes from the old schema still exist on the `bidderlists`
// collection:
//   - applicationId_1        (unique, on a top-level `applicationId` field
//                              that no longer exists in the schema)
//   - tenderId_1_userId_1    (unique, on a top-level `userId` field that
//                              no longer exists in the schema)
//
// Since neither field exists on documents anymore, every document has
// applicationId: null and userId: null at the top level. The unique
// constraints then collide on that shared `null` value as soon as a
// second document is inserted, throwing:
//   E11000 duplicate key error ... dup key: { applicationId: null }
//   E11000 duplicate key error ... dup key: { tenderId: ..., userId: null }
//
// This script drops both stale indexes so BiddersList.save() /
// findOneAndUpdate() work purely off the indexes actually declared in
// models/BiddersList.js:
//   - { tenderId: 1 }
//   - { 'applications.userId': 1 }
//
// USAGE:
//   node scripts/fixBiddersListIndexes.js
//
// Reads the same MONGODB_URI / MONGO_URI your app already uses — adjust
// the env var name below if your app uses a different one.

require('dotenv').config()
const mongoose = require('mongoose')

const MONGO_URI = process.env.MONGODB_URI
const STALE_INDEXES = ['applicationId_1', 'tenderId_1_userId_1']

async function run() {
  if (!MONGO_URI) {
    console.error('No MONGODB_URI / MONGO_URI found in environment. Aborting.')
    process.exit(1)
  }

  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB.')

  const collection = mongoose.connection.db.collection('bidderlists')

  const existing = await collection.indexes()
  console.log('Current indexes on bidderlists:')
  existing.forEach((idx) => console.log(`  - ${idx.name}`, idx.key))

  for (const indexName of STALE_INDEXES) {
    const found = existing.find((idx) => idx.name === indexName)
    if (!found) {
      console.log(`Index "${indexName}" not present — nothing to drop.`)
      continue
    }
    try {
      await collection.dropIndex(indexName)
      console.log(`Dropped stale index "${indexName}".`)
    } catch (err) {
      console.error(`Failed to drop index "${indexName}":`, err.message)
    }
  }

  const remaining = await collection.indexes()
  console.log('Remaining indexes on bidderlists:')
  remaining.forEach((idx) => console.log(`  - ${idx.name}`, idx.key))

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})