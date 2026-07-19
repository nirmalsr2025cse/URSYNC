// src/pages/Completed.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { tenders } from '../data/tenders'

// ── Flatten and filter only Completed tenders ─────────────────────────────────
const COMPLETED_TENDERS = [
  ...tenders.ongoing,
  ...tenders.upcoming,
  ...tenders.completed,
].filter((t) => t.status === 'Completed')

export default function Completed() {
  const navigate  = useNavigate()
  const PAGE_SIZE = useResponsiveItemsPerPage()

  const [search,      setSearch]      = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return COMPLETED_TENDERS
    const q = search.trim().toLowerCase()
    return COMPLETED_TENDERS.filter((t) =>
      t.id?.toLowerCase().includes(q)           ||
      t.title?.toLowerCase().includes(q)        ||
      t.department?.toLowerCase().includes(q)   ||
      t.organization?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q)
    )
  }, [search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage, PAGE_SIZE])

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
      state: { tender , fromPath: '/completed'},
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
              className="input-base pl-10"
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
          {filtered.length} completed
        </span>
      </div>

      {/* ── Cards ──────────────────────────────────────────────────────── */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-tn-border border-dashed">
          <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
            <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="font-bold text-tn-navy mb-1">No completed tenders found</p>
          <p className="text-sm text-tn-muted text-center max-w-xs">
            {search
              ? 'No tenders match your search. Try different keywords.'
              : 'There are no completed tenders available right now.'
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
            <div key={tender.id} className="flex">
              <TenderCard
                tender={tender}
                viewMode="grid"
                className="flex-1"
                onClick={() => handleCardClick(tender)}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {filtered.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}