// src/controllers/reportsFeedbacksController.js
//
// Visibility rule:
//   - administrator: sees EVERY report/feedback across ALL departments,
//     sorted by submittedDate descending (newest first). This is the one
//     explicit exception to the department-only rule below.
//   - every other role: only ever sees reports/feedbacks belonging to
//     THEIR OWN department. Filtering is purely by departmentId — never
//     by userId, never by any other role-specific logic.
//
// NOTE on isDeleted: seeded/legacy documents may not have an `isDeleted`
// field at all. Using `{ $ne: true }` matches both "isDeleted: false" AND
// "field absent".
//
// NOTE on tenderId resolution: this file deliberately does NOT use
// Mongoose .populate('tenderId', ...) — populate silently resolves to
// `null` if the referenced _id doesn't exist in the `tenders` collection
// (e.g. stale/placeholder seed data), giving zero visibility into why a
// tender code isn't showing. Instead we manually fetch all matching
// Tender docs in one query and build a lookup map, so we can log exactly
// which tenderId values failed to resolve.

const Report = require('../models/Report')
const Feedback = require('../models/Feedback')
const User = require('../models/User')
const Tender = require('../models/Tender')

const NOT_DELETED = { $ne: true }

// Loads the authenticated user with role + department populated.
async function loadCurrentUser(req) {
  const currentUser = req.user
  if (!currentUser) return null
  return User.findById(currentUser._id || currentUser.id)
    .populate('roleId')
    .populate('departmentId')
}

// Builds a Map of tenderId(string) -> tenderCode for a list of report/feedback
// docs, by fetching every referenced Tender in a single query. Also logs any
// tenderId that didn't resolve, so a dangling reference is impossible to miss.
async function buildTenderCodeMap(docs, docLabel) {
  const ids = [...new Set(docs.map((d) => d.tenderId).filter(Boolean).map((id) => id.toString()))]
  if (ids.length === 0) return new Map()

  const tenders = await Tender.find({ _id: { $in: ids } }).select('tenderCode').lean()
  const map = new Map(tenders.map((t) => [t._id.toString(), t.tenderCode]))

  const missing = ids.filter((id) => !map.has(id))
  if (missing.length > 0) {
    console.warn(
      `[reportsFeedbacksController] ${missing.length} ${docLabel} reference a tenderId with no matching document in the tenders collection:`,
      missing
    )
  }

  return map
}

// ── formatters ─────────────────────────────────────────────────────────────
function formatReport(r, tenderCodeMap) {
  const code = r.tenderId ? tenderCodeMap.get(r.tenderId.toString()) : null
  return {
    id: r._id.toString(),
    reportCode: r.reportCode,
    title: r.title,
    description: r.description || '',
    department: r.departmentId?.name || '—',
    departmentId: r.departmentId?._id?.toString() || null,
    tenderId: code || (r.tenderId ? `Unresolved (${r.tenderId})` : '—'),
    priority: r.priority || 'Low',
    status: r.status || 'Open',
    submittedDate: r.submittedDate,
    reportedByUserId: r.reportedByUserId?.toString() || null,
    reporterRoleLabel: r.reporterRoleLabel || '',
  }
}

function formatFeedback(f, tenderCodeMap) {
  const code = f.tenderId ? tenderCodeMap.get(f.tenderId.toString()) : null
  return {
    id: f._id.toString(),
    feedbackCode: f.feedbackCode,
    title: f.title,
    description: f.description || '',
    department: f.departmentId?.name || '—',
    departmentId: f.departmentId?._id?.toString() || null,
    tenderId: code || (f.tenderId ? `Unresolved (${f.tenderId})` : '—'),
    rating: f.rating,
    status: f.status || 'Pending',
    submittedDate: f.submittedDate,
    userName: f.userNameLabel || (f.userId ? 'Registered Bidder' : 'Anonymous Bidder'),
    userId: f.userId ? f.userId.toString() : null,
  }
}

// ── GET /api/reports-feedbacks/reports ─────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const isAdministrator = me.roleId?.name === 'administrator'
    const query = { isDeleted: NOT_DELETED }

    if (isAdministrator) {
      // No departmentId filter — administrator sees every department.
    } else {
      const myDepartmentId = me.departmentId?._id || me.departmentId
      if (!myDepartmentId) {
        return res.status(200).json({ success: true, count: 0, data: [] })
      }
      query.departmentId = myDepartmentId
    }

    const reports = await Report.find(query)
      .populate('departmentId', 'name code')
      .sort({ submittedDate: -1 }) // newest first — this is the "date wise" ordering for the admin's cross-department view
      .lean()

    const tenderCodeMap = await buildTenderCodeMap(reports, 'report(s)')
    const data = reports.map((r) => formatReport(r, tenderCodeMap))

    return res.status(200).json({ success: true, count: data.length, data })
  } catch (err) {
    console.error('getReports error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/reports-feedbacks/feedbacks ────────────────────────────────────
exports.getFeedbacks = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const isAdministrator = me.roleId?.name === 'administrator'
    const query = { isDeleted: NOT_DELETED }

    if (isAdministrator) {
      // No departmentId filter — administrator sees every department.
    } else {
      const myDepartmentId = me.departmentId?._id || me.departmentId
      if (!myDepartmentId) {
        return res.status(200).json({ success: true, count: 0, data: [] })
      }
      query.departmentId = myDepartmentId
    }

    const feedbacks = await Feedback.find(query)
      .populate('departmentId', 'name code')
      .sort({ submittedDate: -1 })
      .lean()

    const tenderCodeMap = await buildTenderCodeMap(feedbacks, 'feedback(s)')
    const data = feedbacks.map((f) => formatFeedback(f, tenderCodeMap))

    return res.status(200).json({ success: true, count: data.length, data })
  } catch (err) {
    console.error('getFeedbacks error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/reports-feedbacks/reports/:id ─────────────────────────────────
exports.getReportById = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const report = await Report.findOne({ _id: req.params.id, isDeleted: NOT_DELETED })
      .populate('departmentId', 'name code')
      .lean()

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' })
    }

    const isAdministrator = me.roleId?.name === 'administrator'
    if (!isAdministrator) {
      const myDepartmentId = (me.departmentId?._id || me.departmentId)?.toString()
      const reportDeptId = report.departmentId?._id?.toString()
      if (!myDepartmentId || myDepartmentId !== reportDeptId) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this report' })
      }
    }

    const tenderCodeMap = await buildTenderCodeMap([report], 'report(s)')

    return res.status(200).json({ success: true, data: formatReport(report, tenderCodeMap) })
  } catch (err) {
    console.error('getReportById error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}

// ── GET /api/reports-feedbacks/feedbacks/:id ────────────────────────────────
exports.getFeedbackById = async (req, res) => {
  try {
    const me = await loadCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const feedback = await Feedback.findOne({ _id: req.params.id, isDeleted: NOT_DELETED })
      .populate('departmentId', 'name code')
      .lean()

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' })
    }

    const isAdministrator = me.roleId?.name === 'administrator'
    if (!isAdministrator) {
      const myDepartmentId = (me.departmentId?._id || me.departmentId)?.toString()
      const feedbackDeptId = feedback.departmentId?._id?.toString()
      if (!myDepartmentId || myDepartmentId !== feedbackDeptId) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this feedback' })
      }
    }

    const tenderCodeMap = await buildTenderCodeMap([feedback], 'feedback(s)')

    return res.status(200).json({ success: true, data: formatFeedback(feedback, tenderCodeMap) })
  } catch (err) {
    console.error('getFeedbackById error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}