// src/controllers/financialChangingController.js
//
// Backs the Tender Financial Changes page. Three endpoints:
//
//   GET   /api/financial-changes            -> list every tender with
//                                              financialField: true, each
//                                              merged with the LAST entry
//                                              of its FinancialChange
//                                              document's amountchanges
//                                              array (original/revised
//                                              amount, reason, priority).
//   PATCH /api/financial-changes/:tenderCode/approve
//                                            -> writes the given amount
//                                              into Tender.estimatedValue,
//                                              flips financialField to
//                                              false, tender disappears
//                                              from the Apply list.
//   PATCH /api/financial-changes/:tenderCode/reject
//                                            -> just flips financialField
//                                              to false, no amount touched.
//
// The frontend Edit button never calls this controller — editing the
// amount only changes what's shown on the card. The edited value is only
// persisted when the user clicks Approve, at which point it's sent as
// `revisedAmount` in the approve request body.

const Tender = require('../models/Tender')
const FinancialChange = require('../models/FinancialChange')

// GET /api/financial-changes
async function getFinancialChangeRequests(req, res) {
  try {
    const filter = { financialField: true, isDeleted: false }

    // Scope to the logged-in Tender/Financial Authority's own department,
    // same pattern used on the rest of the Tender Financial Changes
    // feature. Skip this if req.user isn't populated with departmentId in
    // your auth middleware, or if this endpoint should show all
    // departments.
    if (req.user?.departmentId) {
      filter.departmentId = req.user.departmentId
    }

    const tenders = await Tender.find(filter)
      .populate('departmentId', 'name')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .populate('createdBy', 'fullName')
      .sort({ updatedAt: -1 })
      .lean()

    if (tenders.length === 0) {
      return res.json({ success: true, data: [] })
    }

    const tenderCodes = tenders.map((t) => t.tenderCode)
    const changes = await FinancialChange.find({ tenderCode: { $in: tenderCodes } }).lean()
    const changeByCode = new Map(changes.map((c) => [c.tenderCode, c]))

    const data = tenders
      .map((t) => {
        const change = changeByCode.get(t.tenderCode)
        const last = change?.amountchanges?.[change.amountchanges.length - 1]

        // A tender flagged financialField: true with no matching
        // FinancialChange entry is a data-consistency problem elsewhere in
        // the flow (the flag is only ever set inside the same operation
        // that pushes the entry) — skip it defensively rather than
        // rendering a broken card.
        if (!last) return null

        return {
          tenderCode: t.tenderCode,
          projectName: t.title,
          organization: t.departmentId?.name || '',
          category: t.categoryId?.name || t.procurementType || '',
          procurementType: t.procurementType,
          district: t.districtId?.name || t.location || '',
          requestedBy: t.createdBy?.fullName || '',
          requestedDate: `${last.date}T${last.time}`,
          originalCost: last.originalAmount,
          revisedCost: last.revisedAmount,
          reason: last.reason,
          priority: last.priority,
          documentUrl: t.documentUrl || null,
        }
      })
      .filter(Boolean)

    return res.json({ success: true, data })
  } catch (err) {
    console.error('getFinancialChangeRequests error:', err)
    return res.status(500).json({ success: false, message: 'Failed to load financial change requests' })
  }
}

// PATCH /api/financial-changes/:tenderCode/approve
// body: { revisedAmount }
async function approveFinancialChange(req, res) {
  try {
    const { tenderCode } = req.params
    const { revisedAmount } = req.body

    const amount = Number(revisedAmount)
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'revisedAmount must be a valid non-negative number' })
    }

    const tender = await Tender.findOne({ tenderCode, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    tender.estimatedValue = amount
    tender.financialField = false
    tender.updatedBy = req.user?._id || tender.updatedBy
    await tender.save()

    return res.json({ success: true, message: 'Financial change approved', data: { tenderCode, estimatedValue: amount } })
  } catch (err) {
    console.error('approveFinancialChange error:', err)
    return res.status(500).json({ success: false, message: 'Failed to approve financial change' })
  }
}

// PATCH /api/financial-changes/:tenderCode/reject
async function rejectFinancialChange(req, res) {
  try {
    const { tenderCode } = req.params

    const tender = await Tender.findOne({ tenderCode, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    tender.financialField = false
    tender.updatedBy = req.user?._id || tender.updatedBy
    await tender.save()

    return res.json({ success: true, message: 'Financial change rejected', data: { tenderCode } })
  } catch (err) {
    console.error('rejectFinancialChange error:', err)
    return res.status(500).json({ success: false, message: 'Failed to reject financial change' })
  }
}

module.exports = {
  getFinancialChangeRequests,
  approveFinancialChange,
  rejectFinancialChange,
}