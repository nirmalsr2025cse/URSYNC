// src/pages/SearchResourcePage.jsx
// Auto-search version, matching CancelledRetendered.jsx's pattern:
// - No Search button — debounced fetch fires as the user types.
// - Loads all available resources on mount (page is never blank).
// - Clear All resets the keyword and refetches everything.
// - Backend (searchResourcesController.js) already filters
//   available:true, isDeleted:false, so nothing extra needed here.
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../api/client'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 6
const SEARCH_DEBOUNCE_MS = 350

function CategoryIcon({ category }) {
  const map = {
    'Heavy Equipment':        'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    'Lifting Equipment':      'M13 10V3L4 14h7v7l9-11h-7z',
    'Concrete Equipment':     'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    'Support Equipment':      'M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4',
    'Road Equipment':         'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    'Transport Equipment':    'M3 13h1v6a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1v-6h1V8l-2-5H5L3 8v5z',
    'Power Equipment':        'M13 10V3L4 14h7v7l9-11h-7z',
    'Foundation Equipment':   'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  }
  const d = map[category] || map['Heavy Equipment']
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  )
}

function SearchResourceCard({ resource, onView, onGetResource }) {
  return (
    <div className="bg-white rounded-2xl border border-tn-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      <div className="h-1.5 w-full bg-emerald-400" />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600">
              <CategoryIcon category={resource.category} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-tn-navy leading-snug truncate">{resource.name}</h3>
              <p className="text-[10px] text-tn-muted">{resource.id}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
            Available
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {[
            { label: 'District', value: resource.district },
            { label: 'Owner', value: resource.owner },
            { label: 'Daily Rate', value: `₹${(resource.dailyRate ?? 0).toLocaleString('en-IN')}` },
            { label: 'Units', value: `${resource.quantity ?? 0} available` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] font-semibold text-tn-muted uppercase tracking-wide">{label}</p>
              <p className="text-xs font-medium text-tn-navy mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-tn-muted bg-tn-cream px-3 py-1.5 rounded-lg border border-tn-border mb-4">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {resource.specs}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-tn-border">
          <button
            onClick={() => onView(resource)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-tn-border text-tn-navy bg-white hover:bg-tn-light transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
          <button
            onClick={() => onGetResource(resource)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Get Resource
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SearchResourcePage() {
  const navigate = useNavigate()
  const { apiFetch } = useApi()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const debounceRef  = useRef(null)
  const requestIdRef = useRef(0)
  const isFirstRun   = useRef(true)

  // ── Fetch from backend ───────────────────────────────────────────────
  const fetchResources = useCallback(async (kw) => {
    const myRequestId = ++requestIdRef.current
    setError('')
    setLoading(true)
    try {
      const qs = kw.trim() ? `?q=${encodeURIComponent(kw.trim())}` : ''
      const data = await apiFetch(`/search-resources${qs}`)
      if (myRequestId !== requestIdRef.current) return

      setResults(data.resources || [])
      setCurrentPage(1)
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return
      console.error('Search resource fetch failed:', err)
      setError(err.message || 'Failed to load resources. Please try again.')
      setResults([])
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false)
    }
  }, [apiFetch])

  // ── Initial load: fetch ALL available resources, page is never blank ──
  useEffect(() => {
    fetchResources('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-search: debounced, fires on keyword change ───────────────────
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResources(search)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearch('')
    fetchResources('')
  }

  function handleChipClick(chip) {
    setSearch(chip)
  }

  function goTo(path, opts) {
    window.scrollTo({ top: 0, behavior: 'instant' })
    navigate(path, opts)
  }

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const paginated = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const CHIPS = ['JCB', 'Crane', 'Bulldozer', 'Water Tanker', 'Tipper', 'Generator', 'Roller', 'Paver']

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in bg-tn-cream">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-tn-navy">Search Resource</h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Search for available government construction resources such as JCB, crane, bulldozer and more.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-tn-muted">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-semibold">Search Resource</span>
        </nav>
      </div>

      {/* ── Search Bar (auto-search, no Search button) ── */}
      <div className="bg-white border border-tn-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. JCB, crane, bulldozer, water tanker…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-tn-border rounded-xl bg-white text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue transition-all"
            />
            {loading && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <div className="w-4 h-4 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {search && (
            <button onClick={handleClear} className="text-xs text-tn-muted hover:text-tn-danger underline px-2 whitespace-nowrap">
              Clear All
            </button>
          )}
        </div>

        {/* Popular chips */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-tn-muted font-semibold">Popular:</span>
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className={[
                'text-[11px] px-3 py-1 rounded-full border transition-colors font-medium',
                search === chip
                  ? 'bg-tn-navy text-white border-tn-navy'
                  : 'bg-tn-light border-tn-border text-tn-navy hover:bg-tn-light/70',
              ].join(' ')}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* ── Result count row ── */}
      {!error && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-semibold text-tn-navy">
            {loading
              ? 'Loading resources…'
              : results.length > 0
                ? search
                  ? `Showing ${results.length} available resource${results.length !== 1 ? 's' : ''} for "${search}"`
                  : `Showing all ${results.length} available resource${results.length !== 1 ? 's' : ''}`
                : search
                  ? `No available resources found for "${search}"`
                  : 'No available resources found'}
          </p>
          {!loading && (
            <span className="text-xs font-medium text-tn-muted bg-white border border-tn-border px-3 py-1.5 rounded-full">
              {results.length} resource{results.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Cards grid ── */}
      {!error && (
        <>
          {!loading && paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-tn-border border-dashed">
              <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
                <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="font-bold text-tn-navy mb-1">No resources found</p>
              <p className="text-sm text-tn-muted">Try a different keyword like "JCB", "crane" or "mixer".</p>
            </div>
          ) : !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
              {paginated.map((res) => (
                <SearchResourceCard
                  key={res._id || res.id}
                  resource={res}
                  onView={(r) => goTo('/search-resource/details', { state: { resource: r } })}
                  onGetResource={(r) => goTo('/search-resource/get-resource', { state: { resource: r } })}
                />
              ))}
            </div>
          )}

          {!loading && paginated.length > 0 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </>
      )}
    </div>
  )
}