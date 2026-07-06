// src/pages/Pending.jsx
import React, { useState, useMemo } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { tenders } from '../data/tenders'

// ── Flatten all non-completed tenders (pending = not yet completed) ──────────
const PENDING_TENDERS = [
  ...tenders.ongoing,
  ...tenders.upcoming,
]


const PAGE_SIZE = 6

export default function Pending() {
  const [inputVal, setInputVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(PENDING_TENDERS)
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [approvedIds, setApprovedIds] = useState([])
  const [rejectedIds, setRejectedIds] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // { tenderId, action }

  // ── Toast helper ──────────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Approve / Reject handlers ─────────────────────────────────────────────
  function openConfirm(tenderId, action) {
    setConfirmModal({ tenderId, action })
  }

  function handleConfirm() {
    if (!confirmModal) return
    const { tenderId, action } = confirmModal

    if (action === 'approve') {
      setApprovedIds((prev) => [...prev, tenderId])
      setRejectedIds((prev) => prev.filter((id) => id !== tenderId))
      showToast(`Tender ${tenderId} has been approved.`, 'success')
    } else {
      setRejectedIds((prev) => [...prev, tenderId])
      setApprovedIds((prev) => prev.filter((id) => id !== tenderId))
      showToast(`Tender ${tenderId} has been rejected.`, 'error')
    }
    setConfirmModal(null)
  }

  function handleCancelConfirm() {
    setConfirmModal(null)
  }

  // ── Search ────────────────────────────────────────────────────────────────
  async function handleSearch() {
    if (!inputVal.trim()) return
    setLoading(true)
    setActiveTab('all')
    setCurrentPage(1)

    await new Promise((r) => setTimeout(r, 400))

    const q = inputVal.trim().toLowerCase()
    const filtered = PENDING_TENDERS.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.organization && t.organization.toLowerCase().includes(q))
    )
    setResults(filtered)
    setLoading(false)
  }

  function handleClear() {
    setInputVal('')
    setResults(PENDING_TENDERS)
    setActiveTab('all')
    setCurrentPage(1)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch()
  }

  // ── Tab-filtered results (exclude approved/rejected) ──────────────────────
  const visibleResults = useMemo(() => {
    return results.filter(
      (t) => !approvedIds.includes(t.id) && !rejectedIds.includes(t.id)
    )
  }, [results, approvedIds, rejectedIds])

  const tabResults = useMemo(() => {
    if (activeTab === 'all') return visibleResults
    if (activeTab === 'ongoing') return visibleResults.filter((t) => t.status === 'Ongoing')
    if (activeTab === 'upcoming') return visibleResults.filter((t) => t.status === 'Upcoming')
    return visibleResults
  }, [visibleResults, activeTab])

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(tabResults.length / PAGE_SIZE))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return tabResults.slice(start, start + PAGE_SIZE)
  }, [tabResults, currentPage])

  // ── Tab counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all: visibleResults.length,
    ongoing: visibleResults.filter((t) => t.status === 'Ongoing').length,
    upcoming: visibleResults.filter((t) => t.status === 'Upcoming').length,
  }), [visibleResults])

  function switchTab(id) {
    setActiveTab(id)
    setCurrentPage(1)
  }

  function changePage(p) {
    setCurrentPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Status helper for tender ──────────────────────────────────────────────
  function getTenderActionState(tenderId) {
    if (approvedIds.includes(tenderId)) return 'approved'
    if (rejectedIds.includes(tenderId)) return 'rejected'
    return 'pending'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-tn-border p-6 w-full max-w-sm mx-4">
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
            <p className="text-center text-xs text-tn-muted mb-6">
              {confirmModal.action === 'approve'
                ? 'This tender will be marked as approved and move forward in the process.'
                : 'This tender will be rejected and sent back for review.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={[
                  'flex-1 px-5 py-2.5 rounded-lg font-medium text-sm text-white transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2',
                  confirmModal.action === 'approve'
                    ? 'bg-tn-blue'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-400',
                ].join(' ')}
              >
                {confirmModal.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
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
              onKeyDown={handleKeyDown}
              placeholder="Search by Tender ID, title, department, or organization…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
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

          <button
            onClick={handleSearch}
            disabled={!inputVal.trim() || loading}
            className="btn-primary flex items-center justify-center gap-2 min-w-[120px]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </>
            )}
          </button>

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

        {/* Results */}
        {!loading && (
          <>
            {tabResults.length > 0 || visibleResults.length > 0 ? (
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
                    {tabResults.length} tender{tabResults.length !== 1 ? 's' : ''}
                  </span>
                </div>


                {/* Cards grid with Approve buttons */}
                {paginated.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                    {paginated.map((tender) => (
                      <div key={tender.id} className="flex flex-col">
                        <TenderCard
                          tender={tender}
                          viewMode="grid"
                          className="flex-1"
                          onClick={() => { }}
                        />
                        {/* ── Approve / Reject Buttons ─────────────────── */}
                        <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => openConfirm(tender.id, 'approve')}
                            className="flex-1 flex items-center justify-center gap-2 px-10 py-2.5 rounded-xl text-sm font-semibold text-white bg-tn-blue shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                        </button>

                        <button
                            onClick={() => openConfirm(tender.id, 'reject')}
                            className="flex-1 flex items-center justify-center gap-2 px-10 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                        </button>
                        </div>

                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty tab state */
                  <div className="flex flex-col items-center justify-center py-14 text-center bg-white rounded-xl border border-tn-border border-dashed">
                    <div className="w-12 h-12 rounded-full bg-tn-light flex items-center justify-center mb-3 border border-tn-border">
                      <svg className="w-5 h-5 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="font-semibold text-tn-navy mb-1">
                      No {activeTab} tenders
                    </p>
                    <p className="text-xs text-tn-muted">
                      No tenders in this category are pending approval.
                    </p>
                  </div>
                )}

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