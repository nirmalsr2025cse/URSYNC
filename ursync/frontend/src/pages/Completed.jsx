// src/pages/Completed.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { useApi } from '../api/client'

export default function Completed() {
  const navigate  = useNavigate()
  const PAGE_SIZE = useResponsiveItemsPerPage()
  const { apiFetch } = useApi()

  const [search,      setSearch]      = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [tenders, setTenders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Fetch every published (approved) tender, no role or status filter ────
  // Every document in the live tenders collection only exists because it
  // was already approved by a Tender Authority, so this list IS the
  // "approved tenders" list — nothing further to filter on the backend.
  const fetchTenders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/public-tenders')
      setTenders(res.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load tenders')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchTenders()
  }, [fetchTenders])

  // ── Client-side search over the fetched list ──────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return tenders
    const q = search.trim().toLowerCase()
    return tenders.filter((t) =>
      t.id?.toLowerCase().includes(q)           ||
      t.title?.toLowerCase().includes(q)        ||
      t.department?.toLowerCase().includes(q)   ||
      t.organization?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q)
    )
  }, [search, tenders])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage, PAGE_SIZE])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  function handleSearch(e) {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  function handleClear() {
    setSearch('')
    setCurrentPage(1)
  }

  function handleCardClick(tender) {
    navigate('/tender-details-view/' + encodeURIComponent(tender.id), {
      state: { tender, fromPath: '/completed' },
    })
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 min-h-screen animate-fade-in">

      {/* ── Page Header + Breadcrumb ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-tn-navy">
            Completed Tenders
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Successfully completed government tenders across Tamil Nadu.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-tn-muted">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Completed Tenders</span>
        </nav>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-tn-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tn-muted"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search by Tender ID, title, department, or organization..."
              className="w-full pl-10 pr-9 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
            {search && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tn-muted hover:text-tn-navy transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {search && (
            <button
              onClick={handleClear}
              className="px-4 py-2.5 text-sm font-semibold text-tn-danger border border-red-200 rounded-xl hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 rounded-full bg-tn-blue" />
          <div>
            <h2 className="font-bold text-tn-navy text-base">Tender Results</h2>
            <p className="text-xs text-tn-muted">
              {filtered.length} tender{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-tn-muted bg-tn-light border border-tn-border px-3 py-1.5 rounded-full">
          {filtered.length} total
        </span>
      </div>

      {/* ── Loading skeletons ─────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
        </div>
      )}

      {/* ── Fetch error ───────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-red-200 border-dashed">
          <p className="font-bold text-red-600 mb-1">Couldn't load tenders</p>
          <p className="text-sm text-tn-muted mb-4">{error}</p>
          <button
            onClick={fetchTenders}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-tn-blue text-white hover:opacity-90 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Cards ──────────────────────────────────────────────────────── */}
      {!loading && !error && (
        paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-tn-border border-dashed">
            <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
              <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="font-bold text-tn-navy mb-1">No tenders found</p>
            <p className="text-sm text-tn-muted text-center max-w-xs">
              {search
                ? 'No tenders match your search. Try different keywords.'
                : 'There are no approved tenders available right now.'
              }
            </p>
            {search && (
              <button
                onClick={handleClear}
                className="mt-4 text-xs font-semibold text-tn-blue hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {paginated.map((tender) => (
              <div key={tender._id} className="flex">
                <TenderCard
                  tender={tender}
                  viewMode="grid"
                  className="flex-1"
                  onClick={() => handleCardClick(tender)}
                />
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}