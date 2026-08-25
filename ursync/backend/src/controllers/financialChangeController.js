// src/controllers/financialChangeController.js
const mongoose = require('mongoose')
const Tender = require('../models/Tender')
const FinancialChange = require('../models/FinancialChange')

// ── GET /api/financial-changes/tenders ─────────────────────────────────────
// Returns the tenders a department_head should see on the Apply Financial
// Changes page, split by tab:
//   apply   -> tender.status === 'Ongoing' && financialField === false,
//              scoped to the logged-in user's own department
//   applied -> same scope, but financialField === true, each merged with
//              its FinancialChange history so the card can show what was
//              requested and its current status
//
// departmentId comes from req.departmentId (set by auth middleware from the
// logged-in user's own department) with req.query.departmentId as a
// fallback for testing — a department_head only ever sees their own
// department's ongoing tenders, per "only the department head for that
// department can apply for changes."
exports.getFinancialChangeTenders = async (req, res) => {
  try {
    const departmentId = req.departmentId || req.query.departmentId
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'departmentId is required' })
    }
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid departmentId' })
    }

    const baseMatch = {
      status: 'Ongoing',
      isDeleted: false,
      departmentId: new mongoose.Types.ObjectId(departmentId),
    }

    const [applyTenders, appliedTenders] = await Promise.all([
      Tender.find({ ...baseMatch, financialField: false })
        .populate('departmentId', 'name code')
        .populate('categoryId', 'name')
        .populate('districtId', 'name')
        .sort({ closingDate: 1 })
        .lean(),
      Tender.find({ ...baseMatch, financialField: true })
        .populate('departmentId', 'name code')
        .populate('categoryId', 'name')
        .populate('districtId', 'name')
        .sort({ updatedAt: -1 })
        .lean(),
    ])

    // Attach each applied tender's FinancialChange history (the full
    // appliedChanges array) so the card can show the latest amount/status.
    const appliedCodes = appliedTenders.map((t) => t.tenderCode)
    const histories = await FinancialChange.find({ tenderCode: { $in: appliedCodes } })
      .populate('appliedChanges.userId', 'fullName email')
      .lean()
    const historyByCode = Object.fromEntries(histories.map((h) => [h.tenderCode, h]))

    const appliedWithHistory = appliedTenders.map((t) => ({
      ...t,
      financialChange: historyByCode[t.tenderCode] || null,
    }))

    return res.json({
      success: true,
      apply: applyTenders,
      applied: appliedWithHistory,
    })
  } catch (err) {
    console.error('getFinancialChangeTenders error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch financial change tenders' })
  }
}

// ── POST /api/financial-changes/apply ───────────────────────────────────────
// Body: { tenderCode, originalCost, revisedCost, remarks }
// userId comes from req.user (auth middleware) rather than the body, so a
// client can't spoof who raised the request. A department_head may only
// raise a request for a tender that belongs to their own department.
//
// Upsert logic exactly as required: if a FinancialChange doc for this
// tenderCode already exists, push the new entry into its appliedChanges
// array; otherwise create the document with a single-entry array. Either
// way, the tender's financialField is flipped to true so it moves from the
// Apply tab to the Applied tab.
exports.applyFinancialChange = async (req, res) => {
  const { tenderCode, originalCost, revisedCost, remarks } = req.body
  const userId = req.user?._id || req.body.userId
  const departmentId = req.departmentId || req.body.departmentId

  if (!tenderCode || originalCost == null || revisedCost == null) {
    return res.status(400).json({ success: false, message: 'tenderCode, originalCost and revisedCost are required' })
  }
  if (isNaN(Number(originalCost)) || isNaN(Number(revisedCost)) || Number(revisedCost) < 0) {
    return res.status(400).json({ success: false, message: 'originalCost and revisedCost must be valid numbers' })
  }
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authenticated user required' })
  }

  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => {
      const tender = await Tender.findOne({ tenderCode }).session(session)
      if (!tender) {
        throw Object.assign(new Error('Tender not found'), { statusCode: 404 })
      }
      if (tender.status !== 'Ongoing') {
        throw Object.assign(new Error('Financial changes can only be requested for ongoing tenders'), { statusCode: 400 })
      }
      if (departmentId && String(tender.departmentId) !== String(departmentId)) {
        throw Object.assign(new Error('You can only request changes for tenders in your own department'), { statusCode: 403 })
      }

      const newEntry = {
        userId,
        dateOfChange: new Date(),
        originalCost: Number(originalCost),
        revisedCost: Number(revisedCost),
        amount: Number(revisedCost) - Number(originalCost),
        remarks: remarks || '',
        status: 'Pending',
      }

      // Upsert: push into appliedChanges if the doc exists, else create it.
      const financialChange = await FinancialChange.findOneAndUpdate(
        { tenderCode },
        { $push: { appliedChanges: newEntry } },
        { new: true, upsert: true, setDefaultsOnInsert: true, session }
      )

      if (!tender.financialField) {
        tender.financialField = true
        await tender.save({ session })
      }

      result = financialChange
    })

    return res.status(201).json({ success: true, financialChange: result })
  } catch (err) {
    console.error('applyFinancialChange error:', err)
    const status = err.statusCode || 500
    return res.status(status).json({ success: false, message: err.message || 'Failed to submit financial change request' })
  } finally {
    session.endSession()
  }
}

// ── GET /api/review-financial-changes/requests ──────────────────────────────
// For the department_head's Tender Financial Changes page — every tender in
// the logged-in user's OWN department (department_head is a
// department-restricted role, so authMiddleware always sets req.departmentId
// for it), regardless of financialField, so tenders that haven't had a
// change applied yet (financialField: false) still show up alongside ones
// that already have a request pending/approved/rejected. Each tender is
// merged with its FinancialChange doc when one exists; when it doesn't,
// toRow() on the frontend falls back to the tender's own estimatedValue and
// a "Pending" placeholder status.
exports.getAllFinancialChangeRequests = async (req, res) => {
  try {
    const departmentId = req.departmentId
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'No department found for the current user.' })
    }

    const tenders = await Tender.find({
      isDeleted: false,
      departmentId: new mongoose.Types.ObjectId(departmentId),
    })
      .populate('departmentId', 'name code')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .sort({ updatedAt: -1 })
      .lean()

    const codes = tenders.map((t) => t.tenderCode)
    const histories = await FinancialChange.find({ tenderCode: { $in: codes } })
      .populate('appliedChanges.userId', 'fullName email')
      .lean()
    const historyByCode = Object.fromEntries(histories.map((h) => [h.tenderCode, h]))

    const withHistory = tenders.map((t) => ({
      ...t,
      financialChange: historyByCode[t.tenderCode] || null,
    }))

    return res.json({ success: true, requests: withHistory })
  } catch (err) {
    console.error('getAllFinancialChangeRequests error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch financial change requests' })
  }
}

// ── PATCH /api/review-financial-changes/:tenderCode/changes/:changeId/status ──
// Body: { status: 'Approved' | 'Rejected' }
// Sets the status on one specific entry inside appliedChanges (identified by
// its own _id, since a tender can accumulate more than one request over
// time and only the entry actually being reviewed should move).
exports.setFinancialChangeStatus = async (req, res) => {
  const { tenderCode, changeId } = req.params
  const { status } = req.body

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: "status must be 'Approved' or 'Rejected'" })
  }

  try {
    const financialChange = await FinancialChange.findOneAndUpdate(
      { tenderCode, 'appliedChanges._id': changeId },
      { $set: { 'appliedChanges.$.status': status } },
      { new: true }
    )

    if (!financialChange) {
      return res.status(404).json({ success: false, message: 'Financial change request not found' })
    }

    return res.json({ success: true, financialChange })
  } catch (err) {
    console.error('setFinancialChangeStatus error:', err)
    return res.status(500).json({ success: false, message: 'Failed to update request status' })
  }
}

// ── PATCH /api/review-financial-changes/:tenderCode/changes/:changeId ──────
// Body: { revisedCost }
// Lets the reviewer adjust the requested revised amount before approving
// (the "Edit" action on the review card). Recomputes `amount` from
// originalCost so it stays consistent, and resets status back to Pending
// since the numbers changed.
exports.editFinancialChangeAmount = async (req, res) => {
  const { tenderCode, changeId } = req.params
  const { revisedCost } = req.body

  if (revisedCost == null || isNaN(Number(revisedCost)) || Number(revisedCost) < 0) {
    return res.status(400).json({ success: false, message: 'A valid revisedCost is required' })
  }

  try {
    const financialChange = await FinancialChange.findOne({ tenderCode, 'appliedChanges._id': changeId })
    if (!financialChange) {
      return res.status(404).json({ success: false, message: 'Financial change request not found' })
    }

    const entry = financialChange.appliedChanges.id(changeId)
    entry.revisedCost = Number(revisedCost)
    entry.amount = Number(revisedCost) - entry.originalCost
    entry.status = 'Pending'

    await financialChange.save()

    return res.json({ success: true, financialChange })
  } catch (err) {
    console.error('editFinancialChangeAmount error:', err)
    return res.status(500).json({ success: false, message: 'Failed to update requested amount' })
  }
}