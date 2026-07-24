// src/utils/seedTenders.js
// One-time script to migrate the old src/data/tenders.js mock array into
// MongoDB. Run with: node src/utils/seedTenders.js
require('dotenv').config()
const connectDB = require('../config/db')
const Tender = require('../models/Tender')

const toStatus = (s) => s.charAt(0).toUpperCase() + s.slice(1) // 'ongoing' -> 'Ongoing'

// Paste the three arrays (ongoing/upcoming/completed) from the old
// src/data/tenders.js here, or import them if this script lives inside
// the same repo as the frontend.
const mockBuckets = require('./mockTendersSnapshot') // { ongoing: [...], upcoming: [...], completed: [...] }

async function seed() {
  await connectDB()

  const docs = []
  for (const bucket of Object.keys(mockBuckets)) {
    for (const t of mockBuckets[bucket]) {
      docs.push({
        tenderCode: t.id,
        title: t.title,
        description: t.description,
        image: t.image,
        documentUrl: t.documentUrl,
        department: t.department,
        departmentCode: t.departmentCode,
        organization: t.organization,
        category: t.category,
        location: t.location,
        value: t.value,
        startDate: t.startDate ? new Date(t.startDate) : undefined,
        closingDate: new Date(t.closingDate),
        status: toStatus(bucket),
      })
    }
  }

  await Tender.deleteMany({})
  await Tender.insertMany(docs)
  console.log(`Seeded ${docs.length} tenders.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
