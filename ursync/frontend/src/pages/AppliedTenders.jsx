// src/pages/AppliedTenders.jsx
// Now backed by the real API (GET /api/applied-tenders?tab=applied|completed)
// instead of local mock data. Tab placement is date-driven on the backend:
// once a tender's application window (applicationEndDate / applicationDeadline)
// has passed, its card always comes back under tab=completed, where only
// View is shown (never Edit) — see appliedTenderController.bucketFor().

import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TenderCard from '../components/TenderCard'
import { useApi } from '../api/client'
import { FileText, Edit, Eye, CheckCircle2, Clock, Search, X } from 'lucide-react'

const PAGE_SIZE = 6

const TABS = [
  { id: 'applied',   label: 'Applied Tenders',   icon: Clock },
  { id: 'completed', label: 'Completed Tenders', icon: CheckCircle2 },
]

// ── Local Pagination (unchanged) ─────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-[#FFE5BF] bg-white text-[#0A2240] hover:bg-[#FFF2DB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={[
            'w-8 h-8 text-xs font-bold rounded-xl transition-colors',
            currentPage === p
              ? 'bg-[#0A2240] text-white shadow-sm'
              : 'border border-[#FFE5BF] bg-white text-[#0A2240] hover:bg-[#FFF2DB]',
          ].join(' ')}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-[#FFE5BF] bg-white text-[#0A2240] hover:bg-[#FFF2DB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

export default function AppliedTenders() {
  const navigate = useNavigate()
  const location = useLocation()
  const rootPath = location.state?.fromPath || location.pathname
  const { apiFetch } = useApi()

  const [activeTab,   setActiveTab]   = useState('applied') // 'applied' | 'completed'
  const [currentPage, setCurrentPage] = useState(1)
  const [animating,   setAnimating]   = useState(false)
  const [search,      setSearch]      = useState('')

  // ── Data from the backend, one list per tab, fetched lazily and cached
  // in state so switching tabs back and forth doesn't re-fetch every time.
  const [listsByTab, setListsByTab] = useState({ applied: null, completed: null })
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState(null)

  async function loadTab(tab) {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await apiFetch(`/applied-tenders?tab=${tab}`)
      setListsByTab((prev) => ({ ...prev, [tab]: res.data || [] }))
    } catch (err) {
      setLoadError(err.message || 'Failed to load applied tenders.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch the active tab's data the first time it's opened.
  useEffect(() => {
    if (listsByTab[activeTab] === null) {
      loadTab(activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const rawList = listsByTab[activeTab] || []

  const tabCounts = {
    applied:   listsByTab.applied?.length   ?? 0,
    completed: listsByTab.completed?.length ?? 0,
  }

  // ── Live client-side search over the active tab's fetched data ──────────
  const filtered = useMemo(() => {
    if (!search.trim()) return rawList
    const q = search.trim().toLowerCase()
    return rawList.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.department?.toLowerCase().includes(q) ||
        t.applicationId?.toLowerCase().includes(q)
    )
  }, [rawList, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  useEffect(() => { setCurrentPage(1) }, [search, activeTab])

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setCurrentPage(1)
    setTimeout(() => { setActiveTab(id); setAnimating(false) }, 150)
  }

  // View is always available, on both tabs.
  const handleView = (tender) => {
    navigate('/apply-tenders/apply', {
      state: {
        isView: true,
        applicationId: tender.applicationId,
        tenderCode: tender.id,
        fromPath: rootPath,
      },
    })
  }

  // Edit is only ever reachable from the Applied tab (the button itself is
  // only rendered there — see activeTab === 'applied' below). The backend
  // additionally rejects PUTs for tenders whose application window has
  // closed, as a server-side backstop.
  const handleEdit = (tender) => {
    navigate('/apply-tenders/apply', {
      state: {
        isEdit: true,
        applicationId: tender.applicationId,
        tenderCode: tender.id,
        fromPath: rootPath,
      },
    })
  }

  const hasFilters = !!search

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#1A4A8C]" />
            Applied Tenders
          </h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            Manage your submitted applications and track your completed tender submissions.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7A8D]">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#1A4A8C] font-semibold">Applied Tenders</span>
        </nav>
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'applied'
                  ? 'Search applied tenders by title, ID, application no, or department...'
                  : 'Search completed tenders by title, ID, or department...'
              }
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A8D] hover:text-[#0A2240]"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-[#6B7A8D] hover:text-red-500 underline px-2 self-center whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex w-full sm:w-auto items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={[
                  'flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-[#0A2240] text-white shadow-sm'
                    : 'text-[#1A4A8C] border border-[#FFE5BF] bg-transparent hover:bg-[#FFF2DB]',
                ].join(' ')}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]',
                ].join(' ')}>
                  {tabCounts[tab.id]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-start">
          <span className="text-xs font-medium text-[#6B7A8D] bg-white border border-[#FFE5BF] px-3 py-1.5 rounded-full whitespace-nowrap">
            {filtered.length} tender{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <div className="w-8 h-8 border-4 border-[#FFE5BF] border-t-[#1A4A8C] rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#6B7A8D]">Loading your tenders…</p>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────── */}
      {!loading && loadError && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-red-200 border-dashed">
          <p className="font-bold text-red-600 mb-1">Could not load tenders</p>
          <p className="text-sm text-[#6B7A8D] mb-4">{loadError}</p>
          <button
            onClick={() => loadTab(activeTab)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0A2240] text-white hover:bg-[#1A4A8C] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Cards Grid ────────────────────────────────────────────────── */}
      {!loading && !loadError && (
        <div className={[
          'transition-opacity duration-150',
          animating ? 'opacity-0' : 'opacity-100',
        ].join(' ')}>
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
              <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
                <FileText className="w-6 h-6 text-[#6B7A8D]" />
              </div>
              <p className="font-bold text-[#0A2240] mb-1">No {activeTab} tenders found</p>
              <p className="text-sm text-[#6B7A8D] max-w-xs text-center mb-4">
                {search
                  ? `No results match "${search}".`
                  : activeTab === 'applied'
                  ? 'You have not submitted any active tender applications.'
                  : 'No completed tender applications in your history.'}
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0A2240] text-white hover:bg-[#1A4A8C] transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
              {paginated.map((tender) => (
                <div key={tender.applicationId} className="flex flex-col">
                  <TenderCard
                    tender={tender}
                    viewMode="grid"
                    className="flex-1"
                    onClick={() => handleView(tender)}
                    footer={
                      <div className="flex gap-2 mt-2 pt-2 border-t border-[#FFE5BF]">
                        {/* View Button — present on BOTH tabs */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleView(tender)
                          }}
                          className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0A2240] bg-[#FFFAF3] border border-[#FFE5BF] hover:bg-[#FFE5BF]/40 transition-all duration-200"
                        >
                          <Eye className="w-4 h-4 text-[#1A4A8C]" />
                          View Details
                        </button>

                        {/* Edit Button — ONLY on the Applied tab. Once a
                            tender's application window closes, the backend
                            moves its card to the Completed tab, so this
                            button simply stops rendering for it — no extra
                            per-card date check needed here. */}
                        {activeTab === 'applied' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(tender)
                            }}
                            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#1A4A8C] hover:bg-[#0A2240] shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Tender
                          </button>
                        )}
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {!loading && !loadError && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}