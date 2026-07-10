// src/pages/Conflicts.jsx
import React, { useState, useMemo, useEffect } from 'react'
import Pagination from '../components/Pagination'
import { CONFLICTS } from '../data/conflictMockData'
import { useNavigate } from 'react-router-dom'
import { useRole, ROLES } from '../components/RoleContext'

// ── Demo department for the logged-in Department Head (frontend only) ─────
// When connecting the backend, replace with the department from the auth/JWT.
const DEMO_ROLE_DEPARTMENT = 'Highways Department'

// ── Level → style config ──────────────────────────────────────────────────
const LEVEL_STYLES = {
  High: {
    bar: 'bg-red-500',
    badge: 'bg-red-50 text-red-600 border border-red-200',
    shadow: 'hover:shadow-red-100',
  },
  Medium: {
    bar: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    shadow: 'hover:shadow-amber-100',
  },
  Low: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    shadow: 'hover:shadow-emerald-100',
  },
}

const PRIORITY_STYLES = {
  Critical: 'text-red-600',
  High: 'text-tn-blue',
  Medium: 'text-amber-600',
  Low: 'text-emerald-600',
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ── Responsive page size (2 mobile / 4 tablet / 6 desktop) ────────────────
function useResponsivePageSize() {
  const getSize = () => {
    if (typeof window === 'undefined') return 6
    const w = window.innerWidth
    if (w < 768) return 2
    if (w < 1024) return 4
    return 6
  }

  const [pageSize, setPageSize] = useState(getSize)

  useEffect(() => {
    function handleResize() {
      setPageSize(getSize())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return pageSize
}

export default function Conflicts() {
  const navigate = useNavigate()
  const { role } = useRole()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = useResponsivePageSize()

  // ── Role-based visibility ────────────────────────────────────────────────
  // Department Head → only conflicts involving their own department.
  // Administrator → every conflict, but without the Resolve action.
  // Comparison is normalized (trim + lowercase) so this can't silently
  // fail if role ever comes through with different casing/whitespace.
  const normalizedRole = String(role || '').trim().toLowerCase()
  const isAdministrator = normalizedRole === ROLES.ADMINISTRATOR.toLowerCase()
  const isDepartmentHead = normalizedRole === ROLES.DEPARTMENT_HEAD.toLowerCase()

  const conflicts = useMemo(() => {
    if (isDepartmentHead) {
      return CONFLICTS.filter(
        (c) =>
          c.tender1.department === DEMO_ROLE_DEPARTMENT ||
          c.tender2.department === DEMO_ROLE_DEPARTMENT
      )
    }
    return CONFLICTS
  }, [isDepartmentHead])

  useEffect(() => {
    setCurrentPage(1)
  }, [role])

  const totalPages = Math.max(1, Math.ceil(conflicts.length / pageSize))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return conflicts.slice(start, start + pageSize)
  }, [conflicts, currentPage, pageSize])

  function changePage(p) {
    setCurrentPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── View Details ─────────────────────────────────────────────────────────
  // Pass the exact conflict object from this card via navigation state so
  // ConflictDetails.jsx renders precisely what was clicked — no separate
  // re-fetch/re-lookup required. The :id in the URL is kept for deep-linking
  // / refresh, and ConflictDetails falls back to looking it up by id there.
  function handleViewDetails(conflict) {
    navigate(`/conflicts/${conflict.id}`, {
      state: { conflict, fromTab: 'conflicts' },
    })
  }

  function handleResolve(conflict) {
    navigate('/approvement', {
      state: { fromTab: 'conflicts', conflictId: conflict.id },
    })
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in min-h-screen">

      {/* ── Page Header + Breadcrumb ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy flex items-center gap-2">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Tender Conflicts
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Review potential conflicts between upcoming tenders before approval.
          </p>
        </div>
        <nav className="text-xs text-tn-muted flex items-center gap-1.5">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Dashboard</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Conflicts</span>
        </nav>
      </div>

      {/* ── Department-scoped notice (Department Head only) ─────────────── */}
      {isDepartmentHead && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3.5 py-2.5">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>
            Showing conflicts involving <span className="font-semibold">{DEMO_ROLE_DEPARTMENT}</span> only.
          </span>
        </div>
      )}

      {/* ── Conflicts Section ────────────────────────────────────────────── */}
      <section>
        {conflicts.length > 0 ? (
          <>
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
                <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Detected Conflicts
                {isAdministrator && (
                  <span className="text-[10px] font-medium text-tn-muted bg-tn-light border border-tn-border px-2 py-0.5 rounded-full ml-1">
                    All Departments
                  </span>
                )}
              </h2>
              <span className="text-xs font-medium text-tn-muted bg-tn-light px-2.5 py-1 rounded-full border border-tn-border">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {paginated.map((conflict) => {
                const styles = LEVEL_STYLES[conflict.level] || LEVEL_STYLES.Medium
                const { summary } = conflict

                return (
                  <div
                    key={conflict.id}
                    className={[
                      'group flex flex-col bg-white rounded-xl border border-tn-border shadow-sm',
                      'hover:shadow-lg', styles.shadow,
                      'transition-all duration-300 ease-out hover:-translate-y-1 overflow-hidden',
                    ].join(' ')}
                  >
                    {/* Top color indicator */}
                    <div className={`h-1.5 w-full ${styles.bar}`} />

                    <div className="p-5 flex flex-col flex-1">
                      {/* Level badge + Conflict ID */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles.badge}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                          {conflict.level} Conflict
                        </span>
                        <span className="text-xs font-medium text-tn-muted font-mono">{conflict.id}</span>
                      </div>

                      {/* Title + overview */}
                      <h3 className="text-tn-navy font-bold text-base leading-snug mb-1.5 line-clamp-2">
                        {conflict.title}
                      </h3>
                      <p className="text-tn-muted text-xs leading-relaxed mb-4 line-clamp-2">
                        {conflict.overview}
                      </p>

                      {/* Tenders involved */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-2 bg-tn-light rounded-lg px-3 py-2 border border-tn-border">
                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-tn-blue flex-shrink-0" />
                          <span className="text-xs text-tn-navy font-medium leading-snug">{conflict.tender1.name}</span>
                        </div>
                        <div className="flex items-start gap-2 bg-tn-light rounded-lg px-3 py-2 border border-tn-border">
                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-tn-blue flex-shrink-0" />
                          <span className="text-xs text-tn-navy font-medium leading-snug">{conflict.tender2.name}</span>
                        </div>
                      </div>

                      {/* Meta rows */}
                      <div className="space-y-2 mb-4 text-xs">
                        <div className="flex items-center gap-2 text-tn-muted">
                          <svg className="w-4 h-4 text-tn-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                              d="M4 21V5a1 1 0 011-1h8a1 1 0 011 1v16M14 21h6V9.5a1 1 0 00-.6-.9L15 6.7" />
                          </svg>
                          <span className="truncate">
                            {conflict.tender1.department}
                            {conflict.tender1.department !== conflict.tender2.department
                              ? ` • ${conflict.tender2.department}`
                              : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-tn-muted">
                          <svg className="w-4 h-4 text-tn-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                              d="M12 21s-7-6.1-7-11.5a7 7 0 0114 0C19 14.9 12 21 12 21z" />
                            <circle cx="12" cy="9.5" r="2.4" strokeWidth={1.6} />
                          </svg>
                          <span className="truncate">
                            {conflict.location.district} District, {conflict.location.taluk} Taluk, {conflict.location.village}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-tn-muted">
                          <svg className="w-4 h-4 text-tn-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2" strokeWidth={1.6} />
                            <path strokeLinecap="round" strokeWidth={1.6} d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
                          </svg>
                          <span>
                            {formatDate(conflict.tender1.startDate)} vs {formatDate(conflict.tender2.startDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-tn-muted">
                          <svg className="w-4 h-4 text-tn-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="8.5" strokeWidth={1.6} />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 7.5V12l3 2" />
                          </svg>
                          <span>
                            Time Difference:{' '}
                            <span className="font-semibold text-tn-navy">{conflict.timeDifferenceDays} Days</span>
                          </span>
                        </div>
                      </div>

                      {/* Reason + Priority badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="px-2 py-1 rounded-md bg-tn-light border border-tn-border text-tn-navy text-[11px] font-semibold">
                          {conflict.reason}
                        </span>
                        <span className={`px-2 py-1 rounded-md bg-white border border-tn-border text-[11px] font-semibold ${PRIORITY_STYLES[conflict.priority]}`}>
                          Priority: {conflict.priority}
                        </span>
                      </div>

                      {/* Estimated impact */}
                      <div className="mb-4">
                        <p className="text-[11px] text-tn-muted mb-1 font-medium">Estimated Impact</p>
                        <div className="flex flex-wrap gap-1.5">
                          {conflict.impact.map((item) => (
                            <span
                              key={item}
                              className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-medium border border-red-100"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Last updated */}
                      <p className="text-[11px] text-tn-muted mb-4">
                        Last Updated:{' '}
                        <span className="font-medium text-tn-navy">{formatDate(conflict.lastUpdated)}</span>
                      </p>

                      {/* Actions */}
                      <div className="mt-auto flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleViewDetails(conflict)}
                          className={[
                            'btn-secondary text-xs !py-2 flex items-center justify-center gap-1',
                            isAdministrator ? 'w-full' : 'flex-1',
                          ].join(' ')}
                        >
                          View Details
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {!isAdministrator && (
                          <button
                            onClick={() => handleResolve(conflict)}
                            className="flex-1 btn-primary text-xs !py-2"
                          >
                            Resolve Conflict
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={changePage}
              />
            </div>
          </>
        ) : (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-tn-border border-dashed">
            <div className="w-16 h-16 rounded-full bg-tn-light flex items-center justify-center mb-5 border border-tn-border">
              <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-tn-navy text-base mb-2">No Conflicts Detected</h3>
            <p className="text-sm text-tn-muted max-w-xs">
              There are currently no overlapping upcoming tenders requiring review.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

// ── Summary row (Location Match, Timeline Match, etc.) ─────────────────────
function SummaryRow({ label, active }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-tn-muted">{label}</span>
      <span
        className={[
          'flex items-center justify-center w-5 h-5 rounded-full',
          active ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-500',
        ].join(' ')}
      >
        {active ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </span>
    </div>
  )
}