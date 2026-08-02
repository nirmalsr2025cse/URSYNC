// src/pages/Pending.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRole, ROLES } from '../components/RoleContext'
import { useApi } from '../api/client'

const PAGE_SIZE = 6

// Maps role -> the API path segment the backend routes are mounted under
// (see createTenderApprovalRoutes.js: /financial/... and /tender-authority/...)
const ROLE_SEGMENT = {
  [ROLES.FINANCIAL]: 'financial',
  [ROLES.TENDER_AUTHORITY]: 'tender-authority',
}

function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return null
  const num = Number(amount)
  if (Number.isNaN(num)) return null
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `₹ ${num}`
  }
}

// Flattens the populated CreateTender doc from the API into the exact
// shape TenderView.jsx / TenderDetailsView.jsx expect (same fields
// tenderController.js's toCardShape() returns for live Tender docs):
// tenderId, title, projectName, description, image, documentUrl,
// department, departmentCode, organization, category, location, taluk,
// village, latitude, longitude, value, estimatedValue, startDate,
// closingDate, duration, status, isCancelled, cancelledReason,
// cancelledAt, isRetendered, retenderedAt.
//
// NOTE: `projectName` is aliased from `doc.title` (CreateTender's actual
// schema field — see src/models/CreateTender.js). TenderView.jsx's
// Project Details section reads `tender.projectName` rather than
// `tender.title`, a leftover from the old mock-based draft workflow.
// Rather than edit TenderView.jsx, we supply both keys with the same
// value here so it renders correctly without touching that file.
function toCardShape(doc) {
  return {
    ...doc,
    id: doc.tenderId || doc._id,
    _id: doc._id,
    tenderId: doc.tenderId || doc._id,

    title: doc.title,
    projectName: doc.title, // alias for TenderView.jsx's Project Details "Title" row
    description: doc.description || '',
    image: doc.image || '',
    documentUrl: doc.documentUrl || null,

    department: doc.departmentId?.name || '',
    departmentCode: doc.departmentId?.code || '',
    organization: doc.departmentId?.organization || doc.departmentId?.name || '',

    category: doc.categoryId?.name || '',
    location: doc.location || (doc.districtId?.name || ''),
    taluk: doc.taluk || '',
    village: doc.village || '',
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    duration: doc.duration || '',

    estimatedValue: doc.estimatedValue,
    currency: doc.currency,
    value: formatCurrency(doc.estimatedValue, doc.currency) || '—',

    startDate: doc.startDate || null,
    closingDate: doc.closingDate || doc.applicationDeadline || null,

    status: doc.status,

    isCancelled: doc.isCancelled || false,
    cancelledReason: doc.cancelledReason || null,
    cancelledAt: doc.cancelledAt || null,
    isRetendered: doc.isRetendered || false,
    retenderedAt: doc.retenderedAt || null,
  }
}

export default function Pending() {
  const [inputVal, setInputVal] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useRole()
  const { apiFetch } = useApi()

  const roleSegment = ROLE_SEGMENT[role] || null

  // Only tender_authority needs the application date fields during approval.
  // financial just confirms approve/reject with no extra inputs.
  const showApprovalDates = role === ROLES.TENDER_AUTHORITY

  const rootPath = location.state?.fromPath || location.pathname

  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [allTenders, setAllTenders] = useState([]) // raw list from API for current role
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // { tenderId, action }
  const [submitting, setSubmitting] = useState(false)

  // ── Approval date fields (only used when action === 'approve' AND role needs them) ───────────
  // Field names match the backend exactly (createTenderApprovalController.js /
  // Tender & CreateTender models). Order of events is:
  //   applicationStartDate <= applicationEndDate <= applicationDeadline
  // applicationDeadline is the FINAL/hard cutoff — it comes AFTER the normal
  // end date, not before it. (Previously this used applicationStart /
  // applicationDeadline / applicationClosing, which both had different key
  // names than the backend expected AND put "Deadline" in the middle instead
  // of last — that mismatch is what caused the 400 "required" error.)
  const [approvalDates, setApprovalDates] = useState({
    applicationStartDate: '',
    applicationEndDate: '',
    applicationDeadline: '',
  })
  const [dateErrors, setDateErrors] = useState({})

  // ── Reject reason (required for both roles) ───────────────────────────────
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')

  // ── Toast helper ──────────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Fetch pending tenders for the current role ─────────────────────────────
  const fetchPending = useCallback(async () => {
    if (!roleSegment) {
      setAllTenders([])
      setLoading(false)
      return
    }
    setLoading(true)
    setFetchError(null)
    try {
      const res = await apiFetch(`/create-tender-approval/${roleSegment}/pending`)
      setAllTenders((res.data || []).map(toCardShape))
    } catch (err) {
      setFetchError(err.message || 'Failed to load pending tenders.')
      setAllTenders([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleSegment])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  // ── Approve / Reject handlers ─────────────────────────────────────────────
  function openConfirm(tenderId, action) {
    setConfirmModal({ tenderId, action })
    setApprovalDates({ applicationStartDate: '', applicationEndDate: '', applicationDeadline: '' })
    setDateErrors({})
    setRejectReason('')
    setRejectReasonError('')
  }

  function handleDateChange(field, value) {
    setApprovalDates((prev) => ({ ...prev, [field]: value }))
    setDateErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validateApprovalDates() {
    // financial doesn't fill these in at all, so nothing to validate.
    if (!showApprovalDates) return true

    const { applicationStartDate, applicationEndDate, applicationDeadline } = approvalDates
    const errors = {}

    if (!applicationStartDate) errors.applicationStartDate = 'Required'
    if (!applicationEndDate) errors.applicationEndDate = 'Required'
    if (!applicationDeadline) errors.applicationDeadline = 'Required'

    // Order: Start <= End <= Deadline (deadline is the final hard cutoff).
    if (!errors.applicationStartDate && !errors.applicationEndDate) {
      if (new Date(applicationEndDate) < new Date(applicationStartDate)) {
        errors.applicationEndDate = 'Must be on/after Application Start Date'
      }
    }
    if (!errors.applicationEndDate && !errors.applicationDeadline) {
      if (new Date(applicationDeadline) < new Date(applicationEndDate)) {
        errors.applicationDeadline = 'Must be on/after Application End Date'
      }
    }

    setDateErrors(errors)
    return Object.keys(errors).length === 0
  }

  function validateRejectReason() {
    if (!rejectReason.trim()) {
      setRejectReasonError('Please enter a reason for rejection.')
      return false
    }
    setRejectReasonError('')
    return true
  }

  async function handleConfirm() {
    if (!confirmModal || !roleSegment) return
    const { tenderId, action } = confirmModal

    // tenderId here is the card's `id` (tenderId string); we need the
    // Mongo _id to call the API. Look it up from the loaded list.
    const tender = allTenders.find((t) => t.id === tenderId)
    if (!tender) return

    if (action === 'approve') {
      if (!validateApprovalDates()) return

      setSubmitting(true)
      try {
        if (showApprovalDates) {
          await apiFetch(`/create-tender-approval/${roleSegment}/${tender._id}/approve`, {
            method: 'PATCH',
            body: JSON.stringify(approvalDates),
          })
        } else {
          await apiFetch(`/create-tender-approval/${roleSegment}/${tender._id}/approve`, {
            method: 'PATCH',
          })
        }
        setAllTenders((prev) => prev.filter((t) => t._id !== tender._id))
        showToast(`Tender ${tenderId} has been approved.`, 'success')
        setConfirmModal(null)
      } catch (err) {
        showToast(err.message || 'Failed to approve tender.', 'error')
      } finally {
        setSubmitting(false)
      }
    } else {
      if (!validateRejectReason()) return

      setSubmitting(true)
      try {
        await apiFetch(`/create-tender-approval/${roleSegment}/${tender._id}/reject`, {
          method: 'PATCH',
          body: JSON.stringify({ reason: rejectReason.trim() }),
        })
        setAllTenders((prev) => prev.filter((t) => t._id !== tender._id))
        showToast(`Tender ${tenderId} has been rejected.`, 'error')
        setConfirmModal(null)
      } catch (err) {
        showToast(err.message || 'Failed to reject tender.', 'error')
      } finally {
        setSubmitting(false)
      }
    }
  }

  function handleCancelConfirm() {
    setConfirmModal(null)
    setDateErrors({})
    setRejectReason('')
    setRejectReasonError('')
  }

  // ── Client-side search over the currently loaded pending list ─────────────
  const results = useMemo(() => {
    const q = inputVal.trim().toLowerCase()
    if (!q) return allTenders
    return allTenders.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.organization && t.organization.toLowerCase().includes(q))
    )
  }, [allTenders, inputVal])

  useEffect(() => {
    setCurrentPage(1)
  }, [inputVal])

  function handleClear() {
    setInputVal('')
    setCurrentPage(1)
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return results.slice(start, start + PAGE_SIZE)
  }, [results, currentPage])

  function changePage(p) {
    setCurrentPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // NOTE: pass fromPath so Sidebar's getRootSidebarPath can walk back to
  // '/pending' and keep the "Pending" nav item highlighted on the details page.
  // Card itself no longer navigates on click — only the explicit View button does.
  function handleView(tender) {
    navigate('/tender-view/' + encodeURIComponent(tender.tenderId) , {
      state: { tender, role, fromPath: rootPath },
    })
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in min-h-screen">

      {/* ── Toast Notification ──────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in">
          <div className={[
            'flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium',
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200',
          ].join(' ')}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ──────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in p-4">
          <div className={[
            'bg-white rounded-2xl shadow-2xl border border-tn-border p-6 w-full mx-4',
            confirmModal.action === 'approve' && showApprovalDates ? 'max-w-md' : 'max-w-sm',
          ].join(' ')}>
            <div className="flex items-center justify-center mb-4">
              <div className={[
                'w-14 h-14 rounded-full flex items-center justify-center',
                confirmModal.action === 'approve'
                  ? 'bg-emerald-50 border-2 border-emerald-200'
                  : 'bg-red-50 border-2 border-red-200',
              ].join(' ')}>
                {confirmModal.action === 'approve' ? (
                  <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            <h3 className="text-center text-base font-bold text-tn-navy mb-2">
              {confirmModal.action === 'approve' ? 'Approve Tender?' : 'Reject Tender?'}
            </h3>
            <p className="text-center text-sm text-tn-muted mb-1">
              Tender ID: <span className="font-mono font-semibold text-tn-navy">{confirmModal.tenderId}</span>
            </p>
            <p className="text-center text-xs text-tn-muted mb-5">
              {confirmModal.action === 'approve'
                ? (showApprovalDates
                    ? 'This tender will be marked as approved and published as a live tender.'
                    : 'This tender will be approved and forwarded to the Tender Authority.')
                : 'This tender will be rejected and sent back for review.'}
            </p>

            {/* ── Approval date fields — approve action, tender_authority only ── */}
            {confirmModal.action === 'approve' && showApprovalDates && (
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-tn-navy mb-1">
                    Application Start Date
                  </label>
                  <input
                    type="date"
                    value={approvalDates.applicationStartDate}
                    onChange={(e) => handleDateChange('applicationStartDate', e.target.value)}
                    className={[
                      'w-full px-3 py-2 text-sm border rounded-lg bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all',
                      dateErrors.applicationStartDate ? 'border-red-400' : 'border-[#FFE5BF]',
                    ].join(' ')}
                  />
                  {dateErrors.applicationStartDate && (
                    <p className="text-[11px] text-red-600 mt-1">{dateErrors.applicationStartDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-tn-navy mb-1">
                    Application End Date
                  </label>
                  <input
                    type="date"
                    value={approvalDates.applicationEndDate}
                    onChange={(e) => handleDateChange('applicationEndDate', e.target.value)}
                    className={[
                      'w-full px-3 py-2 text-sm border rounded-lg bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all',
                      dateErrors.applicationEndDate ? 'border-red-400' : 'border-[#FFE5BF]',
                    ].join(' ')}
                  />
                  {dateErrors.applicationEndDate && (
                    <p className="text-[11px] text-red-600 mt-1">{dateErrors.applicationEndDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-tn-navy mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={approvalDates.applicationDeadline}
                    onChange={(e) => handleDateChange('applicationDeadline', e.target.value)}
                    className={[
                      'w-full px-3 py-2 text-sm border rounded-lg bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all',
                      dateErrors.applicationDeadline ? 'border-red-400' : 'border-[#FFE5BF]',
                    ].join(' ')}
                  />
                  {dateErrors.applicationDeadline && (
                    <p className="text-[11px] text-red-600 mt-1">{dateErrors.applicationDeadline}</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Reject reason — required for BOTH roles ─────────────────── */}
            {confirmModal.action === 'reject' && (
              <div className="mb-6 text-left">
                <label className="block text-xs font-semibold text-tn-navy mb-1.5">
                  Reason for rejection <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value)
                    if (rejectReasonError) setRejectReasonError('')
                  }}
                  rows={3}
                  placeholder="Explain why this tender is being rejected..."
                  className={[
                    'w-full px-4 py-2.5 text-sm border rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all resize-none',
                    rejectReasonError ? 'border-red-400' : 'border-[#FFE5BF]',
                  ].join(' ')}
                />
                {rejectReasonError && (
                  <p className="text-[11px] text-red-600 mt-1">{rejectReasonError}</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirm}
                disabled={submitting}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting || (confirmModal.action === 'reject' && !rejectReason.trim())}
                className={[
                  'flex-1 px-5 py-2.5 rounded-lg font-medium text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                  confirmModal.action === 'approve'
                    ? 'bg-tn-blue'
                    : 'bg-red-600 hover:bg-red-700',
                ].join(' ')}
              >
                {submitting
                  ? 'Please wait…'
                  : confirmModal.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header + Breadcrumb ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy flex items-center gap-2">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending Approvals
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Review and approve or reject tenders awaiting your authorization.
          </p>
        </div>
        <nav className="text-xs text-tn-muted flex items-center gap-1.5">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Pending</span>
        </nav>
      </div>

      {/* ── Search Section ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
        <p className="text-[10px] font-bold text-tn-muted uppercase tracking-widest mb-2">
          Search Tenders
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search by Tender ID, title, department, or organization…"
              className="w-full pl-10 pr-9 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
              aria-label="Search tenders"
            />
            {inputVal && (
              <button
                onClick={() => setInputVal('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-tn-muted hover:text-tn-navy transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {inputVal && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-tn-muted hover:text-tn-danger underline ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* ── Results Section ──────────────────────────────────────────────── */}
      <section>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="flex flex-col items-center justify-center py-14 text-center bg-white rounded-xl border border-red-200 border-dashed">
            <p className="font-semibold text-red-600 mb-1">Couldn't load pending tenders</p>
            <p className="text-xs text-tn-muted mb-4">{fetchError}</p>
            <button onClick={fetchPending} className="btn-secondary">Try Again</button>
          </div>
        )}

        {/* Results */}
        {!loading && !fetchError && (
          <>
            {results.length > 0 ? (
              <>
                {/* Results header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
                    <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Pending Tenders
                  </h2>
                  <span className="text-xs font-medium text-tn-muted bg-tn-light px-2.5 py-1 rounded-full border border-tn-border">
                    {results.length} tender{results.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                  {paginated.map((tender) => (
                    <div key={tender._id} className="flex flex-col">
                      <TenderCard
                        tender={tender}
                        viewMode="grid"
                        className="flex-1"
                        footer = {
                          <div className="flex items-center gap-2 pt-1">
                            <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openConfirm(tender.id, 'reject')
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-tn-sky text-white border border-tn-sky hover:bg-tn-sky transition-colors"
                            >
                                <RejectIcon /> Reject
                            </button>

                            <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleView(tender)
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors"
                            >
                                <EyeIcon /> View
                            </button>

                            <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openConfirm(tender.id, 'approve')
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-tn-blue text-white transition-colors"
                            >
                                <ApproveIcon /> Approve
                            </button>
                            </div>

                        }
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={changePage}
                />
              </>
            ) : (
              /* No results at all */
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-tn-border border-dashed">
                <div className="w-16 h-16 rounded-full bg-tn-light flex items-center justify-center mb-5 border border-tn-border">
                  <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-tn-navy text-base mb-2">No Pending Tenders</h3>
                <p className="text-sm text-tn-muted max-w-xs mb-5">
                  {inputVal
                    ? <>No tenders matching <span className="font-semibold text-tn-navy">"{inputVal}"</span> were found.</>
                    : 'All tenders have been reviewed. Nothing is pending approval.'}
                </p>
                {inputVal && (
                  <button
                    onClick={handleClear}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Search
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

// ── Icon Components ───────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function RejectIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ApproveIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}