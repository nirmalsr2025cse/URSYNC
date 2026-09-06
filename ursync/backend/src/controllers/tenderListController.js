// src/controllers/tenderListController.js
//
// Serves the public "Applications" page tab bar: Open / Upcoming / Completed.
// Reads from the `tenders` collection (Tender model — live, published
// tenders only, created by createTenderApprovalController.tenderAuthorityApprove).
//
// IMPORTANT: this endpoint does NOT use the stored `application` field on
// the Tender document. That field is used elsewhere in the app and is left
// completely untouched here. Instead, the tab is computed live from the
// two actual date fields (plus isDocumentVerified), every time this
// endpoint is hit:
//
//   Upcoming  -> now < applicationEndDate (or applicationEndDate not set)
//   Open      -> applicationEndDate has passed, applicationDeadline hasn't,
//                AND isDocumentVerified is not true
//   Completed -> now >= applicationDeadline, OR isDocumentVerified is true
//                (isDocumentVerified wins outright, regardless of dates)
//
// Computing it live means a tender's tab is always correct at the moment
// it's viewed, regardless of whether its `application` field was ever
// written correctly (e.g. documents inserted directly into MongoDB with a
// hardcoded `application` value that never matched their actual dates).

const Tender = require('../models/Tender')

const VALID_TABS = ['Open', 'Upcoming', 'Completed']

// Given a tender's applicationEndDate/applicationDeadline/isDocumentVerified,
// returns which tab it currently belongs in. Single source of truth for the
// tab logic — used both to build the Mongo query conditions and to label
// each returned tender.
//
// isDocumentVerified is checked FIRST and wins outright: once a tender's
// documents have been verified (i.e. sent to department), it always shows
// as Completed regardless of where its application window dates would
// otherwise place it.
function computeTab(applicationEndDate, applicationDeadline, isDocumentVerified, now = new Date()) {
  if (isDocumentVerified) {
    return 'Completed'
  }
  if (applicationDeadline && now >= new Date(applicationDeadline)) {
    return 'Completed'
  }
  if (applicationEndDate && now >= new Date(applicationEndDate)) {
    return 'Open'
  }
  return 'Upcoming'
}

// Mongo query fragment matching computeTab()'s rule for a given tab, built
// against the CURRENT moment `now` is called with. Used to filter directly
// in the database rather than pulling every tender into Node to check.
//
// Completed matches EITHER a passed deadline OR isDocumentVerified: true.
// Open and Upcoming both explicitly exclude isDocumentVerified: true
// tenders, so a verified tender never shows up anywhere except Completed.
function tabQueryCondition(tab, now) {
  switch (tab) {
    case 'Completed':
      return {
        $or: [
          { applicationDeadline: { $lte: now } },
          { isDocumentVerified: true },
        ],
      }
    case 'Open':
      return {
        isDocumentVerified: { $ne: true },
        applicationEndDate: { $lte: now },
        $or: [
          { applicationDeadline: null },
          { applicationDeadline: { $exists: false } },
          { applicationDeadline: { $gt: now } },
        ],
      }
    case 'Upcoming':
    default:
      return {
        isDocumentVerified: { $ne: true },
        $or: [
          { applicationEndDate: null },
          { applicationEndDate: { $exists: false } },
          { applicationEndDate: { $gt: now } },
        ],
        applicationDeadline: { $not: { $lte: now } },
      }
  }
}

// Shapes a Tender doc into what TenderCard.jsx / Applications.jsx expect.
// `application` in the response is the LIVE-COMPUTED tab, not the stored
// field on the document — deliberately named the same so the frontend
// doesn't need to change what it reads.
function formatTender(t, now) {
  return {
    id: t.tenderCode,
    _id: t._id.toString(),
    title: t.title,
    description: t.description || '',
    image: t.image || '',
    documentUrl: t.documentUrl || '',
    documentFileName: t.documentFileName || '',
    documentFileSize: t.documentFileSize || null,
    department: t.departmentId?.name || '—',
    departmentCode: t.departmentId?.code || '—',
    district: t.districtId?.name || '—',
    category: t.categoryId?.name || '—',
    location: t.location || '',
    taluk: t.taluk || '',
    village: t.village || '',
    latitude: t.latitude ?? t.startLatitude ?? null,
    longitude: t.longitude ?? t.startLongitude ?? null,
    startLatitude: t.startLatitude ?? t.latitude ?? null,
    startLongitude: t.startLongitude ?? t.longitude ?? null,
    endLatitude: t.endLatitude ?? null,
    endLongitude: t.endLongitude ?? null,
    tenderRange: t.tenderRange ?? null,
    duration: t.duration || '',
    value: t.estimatedValue,
    currency: t.currency || 'INR',
    startDate: t.startDate,
    closingDate: t.closingDate,
    applicationStartDate: t.applicationStartDate,
    applicationEndDate: t.applicationEndDate,
    applicationDeadline: t.applicationDeadline,
    isDocumentVerified: t.isDocumentVerified || false,
    application: computeTab(t.applicationEndDate, t.applicationDeadline, t.isDocumentVerified, now),
    status: t.status,
    isCancelled: t.isCancelled || false,
    isRetendered: t.isRetendered || false,
    cancelledReason: t.cancelledReason || null,
  }
}

// ── GET /api/tenders/applications ─────────────────────────────────────────
// Query params:
//   tab        Open | Upcoming | Completed   (required)
//   search     matches tenderCode or title   (optional)
//   department department name               (optional, "All" ignored)
//   district   district name                 (optional, "All" ignored)
//   category   category name                 (optional, "All" ignored)
//   page, limit  pagination (defaults 1 / 6)
exports.getApplicationTenders = async (req, res) => {
  try {
    const now = new Date()

    const { tab, search, department, district, category } = req.query
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6)

    if (!VALID_TABS.includes(tab)) {
      return res.status(400).json({
        success: false,
        message: `tab must be one of: ${VALID_TABS.join(', ')}`,
      })
    }

    const query = { isDeleted: false, ...tabQueryCondition(tab, now) }

    if (search && search.trim()) {
      const q = search.trim()
      // NOTE: $or from the search box combines with the tab's own $or (if
      // any, e.g. the Upcoming/Open/Completed conditions above) via
      // top-level $and-by-default field merge — Mongo handles multiple
      // top-level keys as an implicit AND, so this is safe even when the
      // tab condition also uses $or internally.
      query.$and = [
        {
          $or: [
            { tenderCode: { $regex: q, $options: 'i' } },
            { title: { $regex: q, $options: 'i' } },
          ],
        },
      ]
    }

    // department/district/category come through as names from the
    // frontend's existing filter dropdowns, so resolve them against the
    // populated ref fields via a join-then-filter rather than a raw
    // ObjectId match.
    const tendersQuery = Tender.find(query)
      .populate('departmentId', 'name code')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .sort({ applicationDeadline: 1 })
      .lean()

    let tenders = await tendersQuery

    if (department && department !== 'All') {
      tenders = tenders.filter((t) => t.departmentId?.name === department)
    }
    if (district && district !== 'All') {
      tenders = tenders.filter((t) => t.districtId?.name === district)
    }
    if (category && category !== 'All') {
      tenders = tenders.filter((t) => t.categoryId?.name === category)
    }

    const total = tenders.length
    const start = (page - 1) * limit
    const paginated = tenders.slice(start, start + limit)

    return res.status(200).json({
      success: true,
      count: total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      data: paginated.map((t) => formatTender(t, now)),
    })
  } catch (err) {
    console.error('getApplicationTenders error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/tenders/applications/counts ──────────────────────────────────
// Returns the count for all three tabs in one call, so the tab bar badges
// don't need three separate round trips. Respects the same search/filter
// params as getApplicationTenders so counts stay consistent with what's
// actually shown once a filter is applied. Counts are computed from the
// same live date + isDocumentVerified logic as the list endpoint — never
// from the stored `application` field.
exports.getApplicationTenderCounts = async (req, res) => {
  try {
    const now = new Date()
    const { search, department, district, category } = req.query
    const query = { isDeleted: false }

    if (search && search.trim()) {
      const q = search.trim()
      query.$or = [
        { tenderCode: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
      ]
    }

    let tenders = await Tender.find(query)
      .populate('departmentId', 'name')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .select('applicationEndDate applicationDeadline isDocumentVerified departmentId categoryId districtId')
      .lean()

    if (department && department !== 'All') {
      tenders = tenders.filter((t) => t.departmentId?.name === department)
    }
    if (district && district !== 'All') {
      tenders = tenders.filter((t) => t.districtId?.name === district)
    }
    if (category && category !== 'All') {
      tenders = tenders.filter((t) => t.categoryId?.name === category)
    }

    const counts = { Open: 0, Upcoming: 0, Completed: 0 }
    tenders.forEach((t) => {
      const tab = computeTab(t.applicationEndDate, t.applicationDeadline, t.isDocumentVerified, now)
      counts[tab] += 1
    })

    return res.status(200).json({ success: true, data: counts })
  } catch (err) {
    console.error('getApplicationTenderCounts error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/tenders/applications/meta ─────────────────────────────────────
// Distinct department/district/category name lists for the filter dropdowns,
// drawn only from tenders that actually exist in the live collection
// (rather than the full Department/Category/District master lists).
exports.getApplicationTenderMeta = async (req, res) => {
  try {
    const tenders = await Tender.find({ isDeleted: false })
      .populate('departmentId', 'name')
      .populate('categoryId', 'name')
      .populate('districtId', 'name')
      .select('departmentId categoryId districtId')
      .lean()

    const departments = [...new Set(tenders.map((t) => t.departmentId?.name).filter(Boolean))]
    const districts = [...new Set(tenders.map((t) => t.districtId?.name).filter(Boolean))]
    const categories = [...new Set(tenders.map((t) => t.categoryId?.name).filter(Boolean))]

    return res.status(200).json({
      success: true,
      data: { departments, districts, categories },
    })
  } catch (err) {
    console.error('getApplicationTenderMeta error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}