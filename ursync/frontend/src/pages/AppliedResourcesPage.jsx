// src/pages/AppliedResourcesPage.jsx
//
// Shows the logged-in user's own Resource Requests (see
// GetResourcePage.jsx -> POST /api/resource-requests) as a list of
// full-width cards: Resource Name, Required From, Required Until, and
// Status (Pending / Approved / Rejected).
//
// Backed by GET /api/resource-requests/mine (already implemented in
// controllers/resourceRequestController.js -> getMyRequests). That
// endpoint filters by req.user._id server-side via authMiddleware, so
// this page only ever needs to call it with no params — it can't leak
// another user's requests.
//
// Pagination is client-side (the /mine endpoint returns the user's
// full request list, which is small), 15 cards per page.
//
// NEW: the header also shows a "Department" pill sourced from
// localStorage('user') — the same object saved at login. It's read
// straight from localStorage rather than re-fetched from the API,
// since it's only used for display here and authMiddleware already
// derives the authoritative req.role/req.departmentCode server-side
// for anything that actually needs access control.
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Calendar, AlertCircle, Loader2, RefreshCw,
  CheckCircle2, XCircle, Clock, ArrowLeft, Building2,
} from 'lucide-react'
import { useApi } from '../api/client'
import Pagination from '../components/Pagination'

const ITEMS_PER_PAGE = 15

// Status -> badge color + icon, matching the tn.* palette already used
// across the app (success = green, danger = red, warn = orange).
const STATUS_STYLES = {
  Pending:  { classes: 'bg-tn-amber text-tn-warn border border-tn-gold',      Icon: Clock       },
  Approved: { classes: 'bg-green-50 text-tn-success border border-green-200', Icon: CheckCircle2 },
  Rejected: { classes: 'bg-red-50 text-tn-danger border border-red-200',      Icon: XCircle      },
  Completed:{ classes: 'bg-blue-50 text-tn-blue border border-blue-200',       Icon: CheckCircle2 },
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Reads the user object saved at login. Shape is whatever your login
// flow stores — this defensively checks a few likely field names so it
// degrades gracefully instead of crashing if one is missing.
//   - role/department label: user.roleName || user.role
//   - department name:       user.departmentName || user.department?.name || user.department
function readStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Pending
  const { Icon } = style
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${style.classes}`}>
      <Icon size={12} />
      {status || 'Pending'}
    </span>
  )
}

// Small pill shown in the header — the user's role/department, read
// straight from localStorage rather than fetched again from the API.
function DepartmentBadge({ label }) {
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-tn-light text-tn-navy border border-tn-border whitespace-nowrap">
      <Building2 size={12} />
      {label}
    </span>
  )
}

function RequestCard({ req }) {
  return (
    <div className="w-full bg-white rounded-2xl border border-tn-border shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:shadow-md transition-shadow">
      {/* Resource name + ref */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-tn-light flex items-center justify-center flex-shrink-0">
          <ClipboardList size={18} className="text-tn-blue" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-tn-navy truncate">
            {req.resourceName || 'Resource'}
          </p>
          <p className="text-[11px] text-tn-muted mt-0.5">
            {req.resourceId || '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-tn-navy flex-shrink-0">
        <ClipboardList size={13} className="text-tn-muted" />
        <div>
          <p className="text-[9px] font-bold text-tn-muted uppercase tracking-wider">Required</p>
          <p className="font-semibold">{req.requiredQuantity || 1}</p>
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-tn-navy">
          <Calendar size={13} className="text-tn-muted" />
          <div>
            <p className="text-[9px] font-bold text-tn-muted uppercase tracking-wider">From</p>
            <p className="font-semibold">{formatDate(req.requiredFrom)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-tn-navy">
          <Calendar size={13} className="text-tn-muted" />
          <div>
            <p className="text-[9px] font-bold text-tn-muted uppercase tracking-wider">Until</p>
            <p className="font-semibold">{formatDate(req.requiredTo)}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 sm:ml-auto">
        <StatusBadge status={req.status} />
      </div>
    </div>
  )
}

export default function AppliedResourcesPage() {
  const navigate = useNavigate()
  const { apiFetch } = useApi()

  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [currentPage, setCurrentPage] = useState(1)

  // Read once on mount — localStorage doesn't change mid-session for
  // this page's purposes, and re-parsing on every render is wasted work.
  const [storedUser] = useState(readStoredUser)
  const departmentLabel =
    storedUser?.departmentName ||
    storedUser?.department?.name ||
    storedUser?.department ||
    storedUser?.roleName ||
    storedUser?.role ||
    null

  useEffect(() => {
    window.scrollTo(0, 0)
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadRequests() {
    try {
      setLoading(true)
      setError('')
      const data = await apiFetch('/resource-requests/mine')
      setRequests(Array.isArray(data.requests) ? data.requests : [])
      setCurrentPage(1)
    } catch (err) {
      setError(err.message || 'Failed to load your applied resources.')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    navigate(-1)
  }

  const totalPages = Math.max(1, Math.ceil(requests.length / ITEMS_PER_PAGE))
  const pagedRequests = requests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  function handlePageChange(page) {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-tn-cream animate-fade-in">

      {/* Header */}
      <div className="px-4 sm:px-8 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-display font-bold text-tn-navy leading-tight">Applied Resources</h1>
              <DepartmentBadge label={departmentLabel} />
            </div>
            <p className="text-sm text-tn-muted mt-0.5">
              Resources you've requested, and their current approval status.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <nav className="text-xs text-tn-muted flex items-center gap-1.5" aria-label="Breadcrumb">
              <span>Home</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-tn-blue font-medium">Applied Resources</span>
            </nav>
            <button
              onClick={loadRequests}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-tn-border bg-white text-tn-navy text-xs font-semibold hover:bg-tn-light transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-8 py-4 space-y-3 pb-12">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="text-tn-blue animate-spin" />
            <p className="text-sm text-tn-muted">Loading your applied resources…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center">
              <ClipboardList size={24} className="text-tn-blue" />
            </div>
            <p className="text-sm font-semibold text-tn-navy">No resource requests yet.</p>
            <p className="text-xs text-tn-muted max-w-[280px]">
              Once you apply for a resource, it will show up here with its approval status.
            </p>
            <button
              onClick={() => navigate('/search-resource')}
              className="mt-2 px-5 py-2 rounded-xl text-sm font-semibold border border-tn-border text-tn-navy bg-white hover:bg-tn-light transition-colors"
            >
              Search Resources
            </button>
          </div>
        ) : (
          <>
            {pagedRequests.map(req => <RequestCard key={req._id} req={req} />)}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  )
}