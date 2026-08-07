// src/controllers/applyTenderController.js
//
// "Apply Tenders" page — restricted to the tender_person role. Unlike
// Home.jsx's Ongoing/Upcoming/Completed tabs (which filter on
// Tender.status — the project lifecycle), this page filters on
// Tender.application (Upcoming/Open/Completed — the APPLICATION window,
// driven by applicationStartDate/applicationDeadline and kept in sync by
// the pre-save hook + syncApplicationStatuses cron job in Tender.js).
// "Open" tab -> application: 'Open'. "Upcoming" tab -> application:
// 'Upcoming'. Completed is intentionally not exposed here — this page is
// for tenders a bidder can currently or soon apply to.
//
// Once a bidder finishes ApplyTenderForm.jsx (clicks "Next"), a row is
// created for them in `bidderlists` (see
// tempBidderApplicationController.submitApplication). From that point on,
// listApplyTenders excludes that tender from THAT user's results — other
// users still see it normally.

const Tender = require('../models/Tender')
const User = require('../models/User')
const BiddersList = require('../models/BiddersList')
const formatCurrency = require('../utils/formatCurrency')

const APPLICATION_STATES = ['Open', 'Upcoming']

// Loads the authenticated user with role populated. Every handler below
// needs this to enforce the tender_person-only restriction.
async function loadCurrentUser(req) {
  const currentUser = req.user
  if (!currentUser) return null
  return User.findById(currentUser._id || currentUser.id).populate('roleId')
}

function buildJoinStages() {
  return [
    { $match: { isDeleted: false, isCancelled: false } },
    {
      $lookup: {
        from: 'departments',
        localField: 'departmentId',
        foreignField: '_id',
        as: 'departmentDoc',
      },
    },
    { $unwind: '$departmentDoc' },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    { $unwind: '$categoryDoc' },
    {
      $lookup: {
        from: 'districts',
        localField: 'districtId',
        foreignField: '_id',
        as: 'districtDoc',
      },
    },
    { $unwind: { path: '$districtDoc', preserveNullAndEmptyArrays: true } },
  ]
}

// Reshapes an aggregated tender doc into the flat fields ApplyTenders.jsx /
// TenderCard.jsx need. Mirrors tenderController.js's toCardShape, plus the
// application-window fields this page specifically cares about.
function toApplyCardShape(t) {
  return {
    _id: t._id,
    id: t.tenderCode,
    tenderCode: t.tenderCode,
    title: t.title,
    projectName: t.title, // ApplyTenders.jsx reads tender.projectName for search
    description: t.description,
    image: t.image,
    documentUrl: t.documentUrl || null,
    department: t.departmentDoc.name,
    departmentCode: t.departmentDoc.code,
    organization: t.departmentDoc.organization || t.departmentDoc.name,
    category: t.categoryDoc.name,
    district: t.districtDoc ? t.districtDoc.name : '',
    location: t.location || (t.districtDoc ? t.districtDoc.name : ''),
    taluk: t.taluk || '',
    village: t.village || '',
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    duration: t.duration || '',
    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue, // raw number — use this for sorting, not the formatted `value` string
    currency: t.currency || 'INR',
    startDate: t.startDate,
    closingDate: t.closingDate,
    applicationStartDate: t.applicationStartDate || null,
    applicationDeadline: t.applicationDeadline || null,
    application: t.application, // 'Open' | 'Upcoming' | 'Completed'
    status: t.status,
  }
}

// GET /api/apply-tenders?application=Open&search=&category=All&department=All&district=All
async function listApplyTenders(req, res) {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    if (me.roleId?.name !== 'tender_person') {
      return res.status(403).json({ success: false, message: 'Only Tender Person can view this page.' })
    }

    const application = String(req.query.application || 'Open')
    if (!APPLICATION_STATES.includes(application)) {
      return res.status(400).json({ message: `application must be one of ${APPLICATION_STATES.join(', ')}` })
    }

    const search = String(req.query.search || '').trim()
    const category = String(req.query.category || 'All')
    const department = String(req.query.department || 'All')
    const district = String(req.query.district || 'All')

    const stages = buildJoinStages()
    stages.push({ $match: { application } })

    // Once this user has submitted an application for a tender (a
    // bidderlists entry exists for tenderId+this user), that tender should
    // no longer show up in THEIR Apply Tenders list — it's what
    // ApplyTenderForm.jsx's "Next" button finalizes into bidderlists.
    // Other users still see the tender normally.
    const appliedTenderIds = await BiddersList.find({ userId: me._id }).distinct('tenderId')
    if (appliedTenderIds.length) {
      stages.push({ $match: { _id: { $nin: appliedTenderIds } } })
    }

    if (category && category !== 'All') {
      stages.push({ $match: { 'categoryDoc.name': category } })
    }
    if (department && department !== 'All') {
      stages.push({ $match: { 'departmentDoc.name': department } })
    }
    if (district && district !== 'All') {
      stages.push({ $match: { 'districtDoc.name': district } })
    }

    if (search) {
      const regex = { $regex: search, $options: 'i' }
      stages.push({
        $match: {
          $or: [
            { title: regex },
            { tenderCode: regex },
            { 'departmentDoc.name': regex },
            { 'departmentDoc.organization': regex },
          ],
        },
      })
    }

    stages.push({ $sort: { applicationDeadline: 1, closingDate: 1 } })

    const tenders = await Tender.aggregate(stages)
    const data = tenders.map(toApplyCardShape)

    return res.status(200).json({ success: true, count: data.length, data })
  } catch (err) {
    console.error('listApplyTenders error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch tenders', error: err.message })
  }
}

// GET /api/apply-tenders/meta
// Distinct department/district/category names actually present among
// Open/Upcoming tenders — powers the filter dropdowns without the
// frontend needing its own mock DEPARTMENTS/DISTRICTS/CATEGORIES lists.
async function getApplyTenderMeta(req, res) {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    if (me.roleId?.name !== 'tender_person') {
      return res.status(403).json({ success: false, message: 'Only Tender Person can view this page.' })
    }

    const stages = buildJoinStages()
    stages.push({ $match: { application: { $in: APPLICATION_STATES } } })

    const [departments, districts, categories] = await Promise.all([
      Tender.aggregate([...stages, { $group: { _id: '$departmentDoc.name' } }, { $sort: { _id: 1 } }]),
      Tender.aggregate([...stages, { $group: { _id: '$districtDoc.name' } }, { $sort: { _id: 1 } }]),
      Tender.aggregate([...stages, { $group: { _id: '$categoryDoc.name' } }, { $sort: { _id: 1 } }]),
    ])

    return res.status(200).json({
      success: true,
      data: {
        departments: ['All', ...departments.map((d) => d._id).filter(Boolean)],
        districts: ['All', ...districts.map((d) => d._id).filter(Boolean)],
        categories: ['All', ...categories.map((c) => c._id).filter(Boolean)],
      },
    })
  } catch (err) {
    console.error('getApplyTenderMeta error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch filter options', error: err.message })
  }
}

// GET /api/apply-tenders/:tenderCode
// Fetches a single tender by its human-readable tenderCode — used by
// ApplyTenderForm.jsx to populate the read-only "Tender Details" section
// when a bidder opens the Apply form. Applies the same tender_person-only
// restriction and isDeleted/isCancelled filtering as the list endpoint,
// but intentionally does NOT restrict by application state — once a
// bidder has the deadline link/URL, a tender that has since moved to
// Completed/closed should still resolve here (the form itself uses
// applicationDeadline to show the "Application Closed" state), rather
// than surfacing a confusing 404.
async function getApplyTenderByCode(req, res) {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    if (me.roleId?.name !== 'tender_person') {
      return res.status(403).json({ success: false, message: 'Only Tender Person can view this page.' })
    }

    const tenderCode = String(req.params.tenderCode || '').trim()
    if (!tenderCode) {
      return res.status(400).json({ success: false, message: 'tenderCode is required' })
    }

    const stages = buildJoinStages()
    stages.push({ $match: { tenderCode } })
    stages.push({ $limit: 1 })

    const tenders = await Tender.aggregate(stages)
    if (!tenders.length) {
      return res.status(404).json({ success: false, message: 'Tender not found' })
    }

    return res.status(200).json({ success: true, data: toApplyCardShape(tenders[0]) })
  } catch (err) {
    console.error('getApplyTenderByCode error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch tender', error: err.message })
  }
}

module.exports = { listApplyTenders, getApplyTenderMeta, getApplyTenderByCode }