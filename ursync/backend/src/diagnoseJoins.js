// diagnoseJoins.js
// Run with: node diagnoseJoins.js
// Connects to your DB and reports exactly why $lookup joins are dropping tenders.

const mongoose = require('mongoose')
require('dotenv').config()

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/URSYNC'

async function main() {
  await mongoose.connect(MONGO_URI)
  const db = mongoose.connection.db

  const tenders = await db.collection('tenders').find({}).toArray()
  console.log(`Total tenders: ${tenders.length}`)

  let stringDeptId = 0
  let stringCatId = 0
  let missingDeptDoc = 0
  let missingCatDoc = 0
  let ok = 0

  for (const t of tenders) {
    const deptIsString = typeof t.departmentId === 'string'
    const catIsString = typeof t.categoryId === 'string'
    if (deptIsString) stringDeptId++
    if (catIsString) stringCatId++

    // Try to resolve dept/category regardless of stored type
    let deptDoc = null
    let catDoc = null
    try {
      const deptId = deptIsString ? new mongoose.Types.ObjectId(t.departmentId) : t.departmentId
      deptDoc = await db.collection('departments').findOne({ _id: deptId })
    } catch (e) {
      // invalid ObjectId string entirely
    }
    try {
      const catId = catIsString ? new mongoose.Types.ObjectId(t.categoryId) : t.categoryId
      catDoc = await db.collection('categories').findOne({ _id: catId })
    } catch (e) {}

    if (!deptDoc) missingDeptDoc++
    if (!catDoc) missingCatDoc++
    if (deptDoc && catDoc) ok++
  }

  console.log('--- Results ---')
  console.log(`Tenders with departmentId stored as STRING (not ObjectId): ${stringDeptId}`)
  console.log(`Tenders with categoryId stored as STRING (not ObjectId): ${stringCatId}`)
  console.log(`Tenders whose departmentId does NOT resolve to any department doc: ${missingDeptDoc}`)
  console.log(`Tenders whose categoryId does NOT resolve to any category doc: ${missingCatDoc}`)
  console.log(`Tenders that WOULD survive a normal $lookup+$unwind (both resolve): ${ok}`)
  console.log(`Tenders that get SILENTLY DROPPED by your current $unwind: ${tenders.length - ok}`)

  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})