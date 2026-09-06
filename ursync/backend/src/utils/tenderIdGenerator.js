const CreateTender = require('../models/CreateTender')
const Tender = require('../models/Tender')
const Category = require('../models/Category')
const { Counter, getNextSequence } = require('../models/Counter')
const {
  getDepartmentCode,
  PRIMARY_CATEGORIES,
} = require('./departmentCategoryConfig')

/**
 * Scans DB (CreateTender and Tender) for highest existing sequential number
 * for a given department code and year.
 * Only considers valid sequential numbers (< 100,000) to ignore legacy random IDs.
 */
async function getCurrentMaxSequence(deptCode, year) {
  const code = (deptCode || 'GEN').toUpperCase()
  const yr = year || new Date().getFullYear()
  const regex = new RegExp(`^TN/${code}/${yr}/(\\d+)$`, 'i')

  const [createDocs, tenderDocs] = await Promise.all([
    CreateTender.find({ tenderId: { $regex: regex }, isDeleted: false }).select('tenderId').lean(),
    Tender.find({ tenderCode: { $regex: regex } }).select('tenderCode').lean(),
  ])

  let maxNum = 0

  for (const doc of createDocs) {
    if (doc.tenderId) {
      const match = doc.tenderId.match(regex)
      if (match && match[1]) {
        const num = parseInt(match[1], 10)
        if (num > 0 && num < 100000 && num > maxNum) {
          maxNum = num
        }
      }
    }
  }

  for (const doc of tenderDocs) {
    if (doc.tenderCode) {
      const match = doc.tenderCode.match(regex)
      if (match && match[1]) {
        const num = parseInt(match[1], 10)
        if (num > 0 && num < 100000 && num > maxNum) {
          maxNum = num
        }
      }
    }
  }

  return maxNum
}

/**
 * Gets the next sequential tender ID without dynamic counter increments on page view.
 * Sequence strictly starts at 1 for each department and year (e.g. TN/PWD/2026/1, TN/PWD/2026/2).
 */
async function getNextSequentialTenderId(deptCode, year) {
  const code = (deptCode || 'GEN').toUpperCase()
  const yr = year || new Date().getFullYear()

  let maxSeq = await getCurrentMaxSequence(code, yr)
  let nextSeq = maxSeq + 1
  let candidate = `TN/${code}/${yr}/${nextSeq}`

  while (await isTenderIdTaken(candidate)) {
    nextSeq++
    candidate = `TN/${code}/${yr}/${nextSeq}`
  }

  return candidate
}

// Aliases for compatibility
const previewNextTenderId = getNextSequentialTenderId
const generateNextTenderId = getNextSequentialTenderId

/**
 * Checks if a tender ID is already in use by any tender.
 */
async function isTenderIdTaken(tenderId, excludeId = null) {
  if (!tenderId) return false
  const trimmed = tenderId.trim()
  const regex = new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

  const createQuery = { tenderId: { $regex: regex }, isDeleted: false }
  if (excludeId) {
    createQuery._id = { $ne: excludeId }
  }

  const inCreate = await CreateTender.exists(createQuery)
  if (inCreate) return true

  const inTenders = await Tender.exists({
    $or: [
      { tenderCode: { $regex: regex } },
      { id: { $regex: regex } },
    ],
  })
  return !!inTenders
}

/**
 * Ensures all primary tender categories (ROAD, BUILD, WATER, POWER, IT, AGRI, SERVICES)
 * are present in the Category collection.
 */
async function syncDefaultCategories() {
  try {
    const { PRIMARY_CATEGORIES } = require('./departmentCategoryConfig')
    const existing = await Category.find({}).select('name').lean()
    const existingNames = new Set(existing.map(c => c.name.trim().toUpperCase()))

    const toInsert = []
    for (const cat of PRIMARY_CATEGORIES) {
      if (!existingNames.has(cat.toUpperCase())) {
        toInsert.push({
          name: cat,
          type: 'Tender Category',
          isActive: true,
        })
      }
    }

    if (toInsert.length > 0) {
      await Category.insertMany(toInsert)
      console.log(`Synced ${toInsert.length} primary categories.`)
    }
  } catch (err) {
    console.error('syncDefaultCategories error:', err.message)
  }
}

module.exports = {
  getCurrentMaxSequence,
  getNextSequentialTenderId,
  previewNextTenderId,
  generateNextTenderId,
  isTenderIdTaken,
  syncDefaultCategories,
}
