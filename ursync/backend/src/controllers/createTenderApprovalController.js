// src/controllers/createTenderApprovalController.js
//
// Handles the Financial -> Tender Authority approval pipeline for documents
// in the `createtenders` collection (CreateTender model).
//
//   Financial:
//     - GET  pending list  -> status: 'Sent to Financial', sentTo: currentUser
//     - reject             -> writes Rejection log, CreateTender.status = 'Rejected'
//     - approve             -> CreateTender.status = 'Sent to Tender Authority',
//                               sentTo = a user with role 'tender_authority'
//                               (same department as the tender when possible)
//
//   Tender Authority:
//     - GET  pending list  -> status: 'Sent to Tender Authority', sentTo: currentUser
//     - reject             -> same as above (writes Rejection log)
//     - approve             -> requires applicationStartDate / applicationEndDate /
//                               applicationDeadline (entered by the Tender
//                               Authority — NOT the same as the tender's own
//                               startDate/closingDate, which were already set
//                               when the tender was drafted). On confirm:
//                                 - a new document is inserted into the
//                                   `tenders` collection (Tender model) FIRST,
//                                   copying startDate/closingDate straight
//                                   from the CreateTender doc, with
//                                   status 'Upcoming'/'Ongoing' and
//                                   application 'Upcoming' (auto-managed
//                                   by the Tender model's pre-save hook +
//                                   Tender.syncApplicationStatuses() cron).
//                                 - ONLY once that insert succeeds:
//                                   CreateTender.status = 'Approved' and
//                                   applicationStartDate/applicationEndDate/
//                                   applicationDeadline are recorded on the
//                                   draft too (audit trail).
//
// NOTE: req.user is assumed to be populated by your auth middleware and to
// contain at least { _id, roleId } (or role name — see resolveRoleName below).
//
// NOTE ON TRANSACTIONS: mongoose sessions/transactions (session.withTransaction)
// require MongoDB to be running as a replica set. On a standalone `mongod`
// they throw "Transaction numbers are only allowed on a replica set member
// or mongos", which surfaces here as a bare 500. reject/approve below run as
// plain sequential writes instead so this works against a standalone Mongo
// instance too.
//
// IMPORTANT ORDERING FIX (tenderAuthorityApprove):
// The live `Tender` document is now created BEFORE the `CreateTender` doc is
// flipped to 'Approved' and saved. Previously the draft was saved as
// 'Approved' first and the live Tender was inserted afterwards — if that
// insert failed for any reason (validation error, a tenderCode collision
// that exhausted all retries, a bad ref, etc.), the error was thrown, the
// request came back as a 500, but the draft had ALREADY been persisted as
// 'Approved' with nothing in the `tenders` collection to match it. Doing the
// live-insert first means: if it fails, the draft is left completely
// untouched (still 'Sent to Tender Authority', still assigned to you) and a
// real error message comes back — you can just retry. If it succeeds, the
// draft is then marked Approved, so the two are always consistent.

const CreateTender = require('../models/CreateTender')
const Tender = require('../models/Tender')
const Rejection = require('../models/Rejection')
const Role = require('../models/Role')
const User = require('../models/User')
const Department = require('../models/Department')

// ── Helpers ────────────────────────────────────────────────────────────────

// Resolves a human-readable role name for the current user, whether
// req.user.role is already a string (e.g. set by middleware) or only
// req.user.roleId (ObjectId) is available.
async function resolveRoleName(user) {
  if (!user) return null
  if (user.role) return user.role // already resolved by auth middleware
  if (!user.roleId) return null
  const role = await Role.findById(user.roleId).select('name').lean()
  return role ? role.name : null
}

// Finds an active user with the given role name. If multiple exist, this
// picks the first active one — adjust to match a specific department, etc.
// if your business rules require targeting a particular tender_authority.
async function findUserByRoleName(roleName, extraFilter = {}) {
  const role = await Role.findOne({ name: roleName }).select('_id').lean()
  if (!role) return null
  return User.findOne({
    roleId: role._id,
    status: 'Active',
    isDeleted: false,
    ...extraFilter,
  }).select('_id fullName email')
}

// Finds the Tender Authority to route an approved tender to. Prefers a
// tender_authority user in the SAME department as the tender (so a PWD
// tender doesn't land on a TWAD tender authority's desk); falls back to any
// active tender_authority system-wide if none exist for that department.
async function findTenderAuthorityForDepartment(departmentId) {
  if (departmentId) {
    const deptMatch = await findUserByRoleName('tender_authority', { departmentId })
    if (deptMatch) return deptMatch
  }
  // Fallback: no department-specific tender authority found (or tender has
  // no departmentId) — use any active tender_authority.
  return findUserByRoleName('tender_authority')
}

// departmentId needs `code` and `organization` too — Pending.jsx's
// toCardShape() maps doc.departmentId?.code and doc.departmentId?.organization
// for display on TenderView/TenderDetailsView. Selecting only 'name' here
// silently drops those fields from the API response (they render as blank/—
// on the frontend even though the mapping code is correct).
function populateOpts() {
  return [
    { path: 'departmentId', select: 'name code organization' },
    { path: 'categoryId', select: 'name' },
    { path: 'districtId', select: 'name' },
    { path: 'createdBy', select: 'fullName email' },
    { path: 'sentTo', select: 'fullName email' },
  ]
}

// Builds a unique, human-readable tender code, e.g. "TN/PWD/2026/482913".
// CreateTender documents carry a `tenderId` field, but it's the draft's own
// working identifier, not guaranteed unique against the live `tenders`
// collection's tenderCode index — so a fresh code is generated here instead.
function buildTenderCode(deptCode) {
  const year = new Date().getFullYear()
  // Random suffix (not just Date.now()) so two approvals landing in the
  // same millisecond can't generate the same code.
  const suffix = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`
  return `TN/${deptCode || 'GEN'}/${year}/${suffix}`
}

// ── Financial: list pending tenders ─────────────────────────────────────────
exports.getFinancialPending = async (req, res) => {
  try {
    const userId = req.user._id

    const tenders = await CreateTender.find({
      status: 'Sent to Financial',
      sentTo: userId,
      isDeleted: false,
    })
      .populate(populateOpts())
      .sort({ createdAt: -1 })

    return res.status(200).json({ success: true, count: tenders.length, data: tenders })
  } catch (err) {
    console.error('getFinancialPending error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch pending tenders', error: err.message })
  }
}

// ── Tender Authority: list pending tenders ──────────────────────────────────
exports.getTenderAuthorityPending = async (req, res) => {
  try {
    const userId = req.user._id

    const tenders = await CreateTender.find({
      status: 'Sent to Tender Authority',
      sentTo: userId,
      isDeleted: false,
    })
      .populate(populateOpts())
      .sort({ createdAt: -1 })

    return res.status(200).json({ success: true, count: tenders.length, data: tenders })
  } catch (err) {
    console.error('getTenderAuthorityPending error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch pending tenders', error: err.message })
  }
}

// ── Shared: reject a tender (financial OR tender_authority) ────────────────
// Body: { reason: string }
// Runs as plain sequential writes (no session) — see NOTE ON TRANSACTIONS above.
exports.rejectTender = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const currentUser = req.user

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' })
    }

    const tender = await CreateTender.findOne({ _id: id, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' })
    }

    // Must currently be assigned to this user to reject it.
    if (!tender.sentTo || String(tender.sentTo) !== String(currentUser._id)) {
      return res.status(403).json({ success: false, message: 'This tender is not assigned to you.' })
    }

    const roleName = await resolveRoleName(currentUser)
    const roleLabel =
      roleName === 'financial'
        ? 'Financial'
        : roleName === 'tender_authority'
        ? 'Tender Authority'
        : roleName || 'Unknown'

    await Rejection.create({
      tenderId: tender._id,
      departmentId: tender.departmentId,
      cancelledBy: currentUser._id,
      cancelledByRole: roleLabel,
      Reason: reason.trim(),
      RejectedDate: new Date(),
    })

    tender.status = 'Rejected'
    tender.isRejected = true
    tender.updatedBy = currentUser._id
    tender.sentTo = null
    await tender.save()

    return res.status(200).json({ success: true, message: 'Tender rejected.', data: tender })
  } catch (err) {
    console.error('rejectTender error:', err)
    return res.status(500).json({ success: false, message: 'Failed to reject tender', error: err.message })
  }
}

// ── Financial: approve -> forward to Tender Authority ──────────────────────
// On confirm:
//   - CreateTender.status  -> 'Sent to Tender Authority'
//   - CreateTender.sentTo  -> an active user with role 'tender_authority',
//                             preferring one in the same department as the
//                             tender (see findTenderAuthorityForDepartment).
exports.financialApprove = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = req.user

    const tender = await CreateTender.findOne({ _id: id, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' })
    }

    if (!tender.sentTo || String(tender.sentTo) !== String(currentUser._id)) {
      return res.status(403).json({ success: false, message: 'This tender is not assigned to you.' })
    }

    const tenderAuthorityUser = await findTenderAuthorityForDepartment(tender.departmentId)
    if (!tenderAuthorityUser) {
      return res.status(400).json({
        success: false,
        message: 'No active Tender Authority user found to forward this tender to.',
      })
    }

    tender.status = 'Sent to Tender Authority'
    tender.sentTo = tenderAuthorityUser._id
    tender.updatedBy = currentUser._id
    await tender.save()

    return res.status(200).json({
      success: true,
      message: 'Tender approved and sent to Tender Authority.',
      data: tender,
    })
  } catch (err) {
    console.error('financialApprove error:', err)
    return res.status(500).json({ success: false, message: 'Failed to approve tender', error: err.message })
  }
}

// ── Tender Authority: approve -> create live Tender FIRST, then mark Approved ──
// Body: { applicationStartDate, applicationEndDate, applicationDeadline }
// These three are entered by the Tender Authority right now, at approval
// time — they are DIFFERENT from tender.startDate/tender.closingDate, which
// were already set on the CreateTender doc back when it was drafted and are
// simply carried over as-is to the new Tender document.
//
// ORDERING (see the big NOTE at the top of the file): the live Tender is
// inserted FIRST. Only if that insert succeeds do we then flip the
// CreateTender doc to 'Approved' and save it. This guarantees the two
// collections can never end up mismatched — no more "status says Approved
// but tenders collection has nothing" state.
exports.tenderAuthorityApprove = async (req, res) => {
  try {
    const { id } = req.params
    const { applicationStartDate, applicationEndDate, applicationDeadline } = req.body
    const currentUser = req.user

    if (!applicationStartDate || !applicationEndDate || !applicationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'applicationStartDate, applicationEndDate and applicationDeadline are all required.',
      })
    }

    const appStart = new Date(applicationStartDate)
    const appEnd = new Date(applicationEndDate)
    const appDeadline = new Date(applicationDeadline)

    if (isNaN(appStart) || isNaN(appEnd) || isNaN(appDeadline)) {
      return res.status(400).json({ success: false, message: 'Invalid date value(s).' })
    }
    if (appEnd < appStart) {
      return res.status(400).json({ success: false, message: 'applicationEndDate must be on/after applicationStartDate.' })
    }
    if (appDeadline < appEnd) {
      return res.status(400).json({ success: false, message: 'applicationDeadline must be on/after applicationEndDate.' })
    }

    const tender = await CreateTender.findOne({ _id: id, isDeleted: false })
    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' })
    }

    if (!tender.sentTo || String(tender.sentTo) !== String(currentUser._id)) {
      return res.status(403).json({ success: false, message: 'This tender is not assigned to you.' })
    }

    // The tender's own project schedule was already set at draft time —
    // it is NOT part of this approval form. If either is missing on the
    // draft, that's a data problem upstream (CreateTender.jsx should
    // require both), not something to silently default here.
    if (!tender.startDate || !tender.closingDate) {
      return res.status(400).json({
        success: false,
        message: 'This tender is missing its project startDate/closingDate — cannot publish.',
      })
    }

    // Always publish as "Upcoming" regardless of startDate — status no
    // longer auto-computes to "Ongoing" at publish time. It will still be
    // eligible to change later via whatever process/cron updates status
    // going forward, if you have one; this just fixes the value used at
    // creation.
    const liveStatus = 'Upcoming'

    // Look up the department's short code (e.g. "PWD", "TWAD") to build a
    // readable tenderCode — CreateTender's own `tenderId` isn't guaranteed
    // unique against the live tenders collection.
    const dept = await Department.findById(tender.departmentId).select('code').lean()

    // ── STEP 1: create the live Tender doc first ──────────────────────────
    // Try a couple of times in the (very unlikely) event of a tenderCode
    // collision, instead of letting a single collision surface as a 500.
    let createdTender = null
    let lastErr = null
    for (let attempt = 0; attempt < 3 && !createdTender; attempt++) {
      const tenderCode = buildTenderCode(dept?.code)
      try {
        createdTender = await Tender.create({
          tenderCode,
          title: tender.title,
          description: tender.description,
          image: tender.image,
          documentUrl: tender.documentUrl || null,

          departmentId: tender.departmentId,
          categoryId: tender.categoryId,
          districtId: tender.districtId,

          procurementType: undefined, // not tracked on CreateTender; leave unset
          productCategory: '',
          location: tender.location,
          taluk: tender.taluk || '',
          village: tender.village || '',
          latitude: tender.latitude ?? null,
          longitude: tender.longitude ?? null,
          duration: tender.duration || '',

          // Project schedule — copied straight from the CreateTender draft,
          // NOT from this approval request.
          startDate: tender.startDate,
          closingDate: tender.closingDate,

          estimatedValue: tender.estimatedValue,
          currency: tender.currency || 'INR',

          // Application window — entered by the Tender Authority just now.
          // `application` itself is set by the Tender model's pre-save hook
          // based on these three dates (defaults to 'Upcoming', flips to
          // 'Open'/'Completed' over time via
          // Tender.syncApplicationStatuses() on a schedule).
          applicationStartDate: appStart,
          applicationEndDate: appEnd,
          applicationDeadline: appDeadline,

          status: liveStatus,

          createdBy: tender.createdBy,
          updatedBy: currentUser._id,
        })
      } catch (createErr) {
        // 11000 = duplicate key (tenderCode collision) — retry with a fresh code.
        if (createErr.code === 11000) {
          lastErr = createErr
          continue
        }
        // Any other error (validation, cast, etc.) — surface it clearly
        // instead of a bare 500, and DO NOT touch the CreateTender doc at
        // all, so it's left exactly as it was (still assigned to this
        // Tender Authority user, still 'Sent to Tender Authority') and the
        // approval can simply be retried once the data problem is fixed.
        console.error('tenderAuthorityApprove: failed to create live Tender doc:', createErr)
        return res.status(500).json({
          success: false,
          message: 'Failed to publish the live tender. The draft was left unchanged — please try again.',
          error: createErr.message,
          ...(createErr.errors
            ? { fields: Object.keys(createErr.errors).reduce((acc, k) => {
                acc[k] = createErr.errors[k].message
                return acc
              }, {}) }
            : {}),
        })
      }
    }

    if (!createdTender) {
      console.error('tenderAuthorityApprove: exhausted tenderCode retries:', lastErr)
      return res.status(500).json({
        success: false,
        message: 'Failed to generate a unique tender code after multiple attempts. The draft was left unchanged — please try again.',
        error: lastErr?.message,
      })
    }

    // ── STEP 2: only now, after the live Tender exists, mark the draft Approved ──
    try {
      tender.status = 'Approved'
      tender.updatedBy = currentUser._id
      tender.sentTo = null
      tender.applicationStartDate = appStart
      tender.applicationEndDate = appEnd
      tender.applicationDeadline = appDeadline
      await tender.save()
    } catch (saveErr) {
      // The live Tender was already created successfully at this point.
      // The draft failing to save as 'Approved' is now the anomaly to
      // flag — log it clearly so it can be reconciled by hand, but still
      // tell the caller the tender WAS published.
      console.error(
        `tenderAuthorityApprove: live Tender ${createdTender._id} was created, ` +
        `but CreateTender ${tender._id} failed to save as Approved:`,
        saveErr
      )
      return res.status(207).json({
        success: false,
        message: 'The tender was published, but updating the draft status failed. Please refresh and check its status.',
        error: saveErr.message,
        data: { tender: createdTender },
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Tender approved and published.',
      data: { createTender: tender, tender: createdTender },
    })
  } catch (err) {
    console.error('tenderAuthorityApprove error:', err)
    return res.status(500).json({ success: false, message: 'Failed to approve tender', error: err.message })
  }
}