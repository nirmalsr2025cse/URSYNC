// src/pages/YourTenders.jsx
import React, { useState, useMemo } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { tenders } from '../data/tenders'
import { useNavigate } from 'react-router-dom'

// ── Flatten all tenders ───────────────────────────────────────────────────────
const ALL_TENDERS = [
  ...tenders.ongoing,
  ...tenders.upcoming,
  ...tenders.completed,
]

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'all',       label: 'All'       },
  { id: 'ongoing',   label: 'Ongoing'   },
  { id: 'upcoming',  label: 'Upcoming'  },
  { id: 'completed', label: 'Completed' },
]

const PAGE_SIZE = 6

export default function YourTenders() {

  // Current logged-in user email — replace with real auth when backend ready
  const CURRENT_USER = 'srnirmal1809@gmail.com'

  // Pre-filter all tenders belonging to this user
  const USER_TENDERS = useMemo(() =>
    ALL_TENDERS.filter((t) => t.user === CURRENT_USER)
  , [])

  const [inputVal,    setInputVal]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [results, setResults] = useState(
    ALL_TENDERS.filter((t) => t.user === 'srnirmal1809@gmail.com')
  )
  const [activeTab,   setActiveTab]   = useState('all')
  const [searched, setSearched] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const navigate = useNavigate()
  const [activeMarker, setActiveMarker] = useState(null)

  // ── Search ────────────────────────────────────────────────────────────────
  async function handleSearch() {
    if (!inputVal.trim()) return
    setLoading(true)
    setSearched(true)
    setActiveTab('all')
    setCurrentPage(1)
    setActiveMarker(null)

    await new Promise((r) => setTimeout(r, 500))

    const q = inputVal.trim().toLowerCase()
    const filtered = ALL_TENDERS.filter((t) =>
        t.user === 'srnirmal1809@gmail.com' &&
        t.id.toLowerCase().includes(q)
    )
    setResults(filtered)
    setLoading(false)
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  function handleClear() {
    setInputVal('')
    setSearched(true)
    setResults(ALL_TENDERS.filter((t) => t.user === 'srnirmal1809@gmail.com'))
    setActiveTab('all')
    setCurrentPage(1)
  }

  // ── Enter key ─────────────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch()
  }

  // ── Tab filtered results ──────────────────────────────────────────────────
  const tabResults = useMemo(() => {
    if (activeTab === 'all')       return results
    if (activeTab === 'ongoing')   return results.filter((t) => t.status === 'Ongoing')
    if (activeTab === 'upcoming')  return results.filter((t) => t.status === 'Upcoming')
    if (activeTab === 'completed') return results.filter((t) => t.status === 'Completed')
    return results
  }, [results, activeTab])

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(tabResults.length / PAGE_SIZE))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return tabResults.slice(start, start + PAGE_SIZE)
  }, [tabResults, currentPage])

  // ── Tab counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:       results.length,
    ongoing:   results.filter((t) => t.status === 'Ongoing').length,
    upcoming:  results.filter((t) => t.status === 'Upcoming').length,
    completed: results.filter((t) => t.status === 'Completed').length,
  }), [results])

  function switchTab(id) {
    setActiveTab(id)
    setCurrentPage(1)
  }

  function changePage(p) {
    setCurrentPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in min-h-screen">

      {/* ── Page Header + Breadcrumb ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Your Tenders
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Search and manage all tenders that belong to you.
          </p>
        </div>
        <nav className="text-xs text-tn-muted flex items-center gap-1.5">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Your Tenders</span>
        </nav>
      </div>

      {/* ── Search Section ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
        <p className="text-[10px] font-bold text-tn-muted uppercase tracking-widest mb-2">
          Tender ID
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Input */}
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
              placeholder="e.g. TN/PWD or TN/PWD/2024/001"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
              aria-label="Enter Tender ID"
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

          {/* Search button */}
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

          {/* Clear button */}
          {searched && (
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

      {/* ── Results Section ────────────────────────────────────────────── */}
      <section>

        {/* ── Loading skeletons ─────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
          </div>
        )}

        {/* ── After search ──────────────────────────────────────────────── */}
        {!loading && searched && (
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
                    Your Tender Results
                  </h2>
                  <span className="text-xs font-medium text-tn-muted bg-tn-light px-2.5 py-1 rounded-full border border-tn-border">
                    {tabResults.length} tender{tabResults.length !== 1 ? 's' : ''} found
                  </span>
                </div>

                {/* Tab Bar */}
                <div className="overflow-x-auto mb-5 pb-1">
                <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => switchTab(tab.id)}
                      className={[
                        'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
                        activeTab === tab.id
                          ? 'bg-tn-navy text-white shadow-sm'
                          : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
                      ].join(' ')}
                    >
                      {tab.label}
                      <span className={[
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-tn-light text-tn-navy',
                      ].join(' ')}>
                        {counts[tab.id]}
                      </span>
                    </button>
                  ))}
                </div>
                </div>

                {/* Cards grid */}
                {paginated.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                    {paginated.map((tender, idx) => (
                      <div key={tender.id} className="flex">
                        <TenderCard
                          tender={tender}
                          viewMode="grid"
                          className="flex-1"
                          highlighted={activeMarker === idx}
                          onClick={() => {
                            setActiveMarker(idx)
                            navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender } })
                          }}
                        />
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
                      No tenders in this category match your search.
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
              /* No results found */
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-tn-border border-dashed">
                <div className="w-16 h-16 rounded-full bg-tn-light flex items-center justify-center mb-5 border border-tn-border">
                  <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-tn-navy text-base mb-2">No Tenders Found</h3>
                <p className="text-sm text-tn-muted max-w-xs mb-5">
                  No tenders were found matching{' '}
                  <span className="font-semibold text-tn-navy">"{inputVal}"</span>.
                  Try another Tender ID.
                </p>
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
              </div>
            )}
          </>
        )}

        {/* ── Pre-search empty state ─────────────────────────────────────── */}
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-tn-border">
            <div className="w-16 h-16 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-5 border border-[#FFE5BF]">
              <svg className="w-7 h-7 text-tn-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-tn-navy text-base mb-2">Search Your Tenders</h3>
            <p className="text-sm text-tn-muted max-w-xs leading-relaxed">
              Enter a Tender ID above to view your submitted tenders.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}