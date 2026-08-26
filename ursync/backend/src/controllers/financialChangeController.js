// src/controllers/financialChangeController.js
//
// Powers the "Tender Financial Changes" page:
//   GET   /api/financial-changes/apply    -> financialField: false
//   GET   /api/financial-changes/applied  -> financialField: true
//   PATCH /api/financial-changes/:tenderId -> write history (does NOT touch tenders collection's amount)
//
// IMPORTANT: the tenders collection's `estimatedValue` is NEVER modified by
// this feature. Only `financialField` is flipped to true. The actual
// original/revised amounts (and reason) for the Applied tab are resolved
// like this:
//   - Original Cost -> tenders collection, `estimatedValue` (unchanged, always).
//   - Revised Cost  -> financialchanges collection, the LAST entry in that
//                      tender's `amountchanges` array (`revisedAmount`).
//   - Reason        -> financialchanges collection, the LAST entry's `reason`.
//
// Department scoping:
//   - department_head only ever sees tenders belonging to their own
//     department (req.departmentId, set by authMiddleware from the DB).
//   - administrator sees every department's tenders.
const mongoose = require('mongoose')
const Tender = require('../models/Tender')
const FinancialChange = require('../models/FinancialChange')

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

// Shapes a Tender document into what TenderFinancialReviewPage.jsx cards
// expect. `revisedCostOverride` lets the Applied tab substitute the last
// financialchanges entry's revisedAmount in place of estimatedValue.
// `reasonOverride` carries that same entry's reason through to the card.
function toCardShape(tender, revisedCostOverride, reasonOverride) {
  const revisedCost =
    typeof revisedCostOverride === 'number' ? revisedCostOverride : tender.estimatedValue

  return {
    changeId: tender._id,
    tenderId: tender._id,
    tenderCode: tender.tenderCode,
    projectName: tender.title,
    department: tender.departmentId?.name || '-',
    district: tender.districtId?.name || '-',
    category: tender.categoryId?.name || '-',
    requestedBy: tender.updatedBy?.fullName || tender.createdBy?.fullName || '-',
    requestedDate: tender.updatedAt,
    originalCost: tender.estimatedValue, // always from tenders collection, never mutated
    revisedCost,
    reason: reasonOverride || '', // last amountchanges entry's reason, if any
    remarks: tender.remarks || '',
    // No separate approval workflow in this feature — status just mirrors
    // which tab the card belongs to, for the view-modal badge.
    status: tender.financialField ? 'Applied' : 'Not Applied',
    documentCount: tender.documentUrl ? 1 : 0,
  }
}

// Builds the department-scoping filter shared by both list endpoints.
function departmentScope(req) {
  const base = { isDeleted: false }
  if (req.role === 'department_head') {
    if (!req.departmentId) {
      // department_head with no department assigned should see nothing,
      // rather than accidentally seeing every department's tenders.
      base._id = null
    } else {
      base.departmentId = req.departmentId
    }
  }
  // administrator (and any other allowed role) sees all departments —
  // no extra filter added.
  return base
}

const POPULATE_FIELDS = [
  { path: 'departmentId', select: 'name' },
  { path: 'categoryId', select: 'name' },
  { path: 'districtId', select: 'name' },
  { path: 'createdBy', select: 'fullName' },
  { path: 'updatedBy', select: 'fullName' },
]

// GET /api/financial-changes/apply
async function getApplyTenders(req, res) {
  try {
    const filter = { ...departmentScope(req), financialField: false }

    const tenders = await Tender.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ updatedAt: -1 })

    // Apply tab: no revision has happened yet, so Revised Cost == Original
    // Cost == tenders.estimatedValue. No financialchanges lookup needed.
    return res.status(200).json({ requests: tenders.map((t) => toCardShape(t)) })
  } catch (err) {
    console.error('getApplyTenders error:', err)
    return res.status(500).json({ message: 'Failed to load tenders for Apply tab.' })
  }
}

// GET /api/financial-changes/applied
async function getAppliedTenders(req, res) {
  try {
    const filter = { ...departmentScope(req), financialField: true }

    const tenders = await Tender.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ updatedAt: -1 })

    if (tenders.length === 0) {
      return res.status(200).json({ requests: [] })
    }

    // Bulk-fetch the matching financialchanges docs (one query, not N).
    const tenderCodes = tenders.map((t) => t.tenderCode)
    const changeDocs = await FinancialChange.find({ tenderCode: { $in: tenderCodes } })

    // Map tenderCode -> last entry's revisedAmount / reason.
    const lastRevisedByCode = new Map()
    const lastReasonByCode = new Map()
    for (const doc of changeDocs) {
      const last = doc.amountchanges[doc.amountchanges.length - 1]
      if (last) {
        lastRevisedByCode.set(doc.tenderCode, last.revisedAmount)
        lastReasonByCode.set(doc.tenderCode, last.reason || '')
      }
    }

    const requests = tenders.map((t) => {
      const revisedCost = lastRevisedByCode.has(t.tenderCode)
        ? lastRevisedByCode.get(t.tenderCode)
        : t.estimatedValue // fallback safety net, shouldn't normally happen
      const reason = lastReasonByCode.get(t.tenderCode) || ''
      return toCardShape(t, revisedCost, reason)
    })

    return res.status(200).json({ requests })
  } catch (err) {
    console.error('getAppliedTenders error:', err)
    return res.status(500).json({ message: 'Failed to load tenders for Applied tab.' })
  }
}

// PATCH /api/financial-changes/:tenderId
// Body: { revisedAmount, reason }
async function applyFinancialChange(req, res) {
  try {
    const { tenderId } = req.params
    const { revisedAmount, reason } = req.body

    if (!isValidObjectId(tenderId)) {
      return res.status(400).json({ message: 'Invalid tender id.' })
    }

    const revised = Number(revisedAmount)
    if (typeof revisedAmount === 'undefined' || Number.isNaN(revised) || revised < 0) {
      return res.status(400).json({ message: 'A valid revisedAmount is required.' })
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
    if (!trimmedReason) {
      return res.status(400).json({ message: 'A reason for the change is required.' })
    }

    const tender = await Tender.findOne({ _id: tenderId, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ message: 'Tender not found.' })
    }

    // Department scoping — a department_head can only edit their own
    // department's tenders, even if they somehow guess another tender's id.
    if (req.role === 'department_head') {
      if (!req.departmentId || String(tender.departmentId) !== String(req.departmentId)) {
        return res.status(403).json({ message: 'You do not have access to this tender.' })
      }
    }

    // Original amount ALWAYS comes from the tenders collection and is
    // NEVER written back to — this field stays untouched forever.
    const originalAmount = tender.estimatedValue

    // No-op guard: if the entered amount equals the tender's original
    // amount, don't touch financialField and don't write a
    // financialchanges entry at all (reason or not).
    if (originalAmount === revised) {
      const populated = await tender.populate(POPULATE_FIELDS)
      return res.status(200).json({
        message: 'Amount unchanged — no update recorded.',
        request: toCardShape(populated),
      })
    }

    const now = new Date()
    const entry = {
      originalAmount,
      revisedAmount: revised,
      reason: trimmedReason,
      date: now.toISOString().slice(0, 10), // YYYY-MM-DD
      time: now.toTimeString().slice(0, 8), // HH:MM:SS
    }

    // Upsert into financialchanges: create the doc for this tenderCode if
    // it doesn't exist yet, otherwise just push the new entry onto
    // amountchanges. This is the ONLY place the revised amount + reason
    // are stored.
    await FinancialChange.findOneAndUpdate(
      { tenderCode: tender.tenderCode },
      { $push: { amountchanges: entry } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    // tenders collection: flip financialField only. estimatedValue is
    // deliberately left untouched — Original Cost must keep reflecting
    // the tender's true original amount forever.
    tender.financialField = true
    tender.updatedBy = req.user._id
    await tender.save()

    const populated = await tender.populate(POPULATE_FIELDS)

    return res.status(200).json({
      message: 'Amount updated successfully.',
      // revisedCost/reason here are the values just entered (the latest
      // amountchanges entry); originalCost is tender.estimatedValue.
      request: toCardShape(populated, revised, trimmedReason),
    })
  } catch (err) {
    console.error('applyFinancialChange error:', err)
    return res.status(500).json({ message: 'Failed to update tender amount.' })
  }
}

module.exports = { getApplyTenders, getAppliedTenders, applyFinancialChange }