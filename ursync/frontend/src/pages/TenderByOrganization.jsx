import React, { useState, useRef, useEffect, useCallback } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApi } from '../api/client'

const TextBoxStyle = "w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"

const EMPTY_FILTERS = {
  organization:     '',
  organizationType: '',
  tenderCategory:   '',
  district:         '',
  expiry:           '',
}

const ITEMS_PER_PAGE = 6
const SEARCH_DEBOUNCE_MS = 350

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-tn-muted uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenderByOrganization() {
  const { apiFetch } = useApi()
  const navigate = useNavigate()
  const location = useLocation()

  const [filters,     setFilters]     = useState(EMPTY_FILTERS)
  const [results,     setResults]     = useState([])
  const [totalCount,  setTotalCount]  = useState(0)
  const [totalPages,  setTotalPages]  = useState(1)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab,   setActiveTab]   = useState('all')
  const [activeMarker,setActiveMarker]= useState(null)

  const [statusCounts, setStatusCounts] = useState({ all: 0, ongoing: 0, upcoming: 0, completed: 0 })

  // Dropdown option lists, populated from real data via the meta endpoint.
  const [meta, setMeta] = useState({
    organizationTypes: [],
    categories: [],
    districts: [],
    statuses: [],
  })

  const cardRefs = useRef({})
  const debounceRef = useRef(null)
  const requestIdRef = useRef(0) // guards against out-of-order responses

  const rootPath = location.state?.fromPath || location.pathname

  // ── Load dropdown options once on mount ──────────────────────────────────
  useEffect(() => {
    apiFetch('/tenders/by-organization/meta')
      .then((data) => setMeta(data))
      .catch((err) => console.error('Failed to load filter options:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Build query string from current filters + tab + page ────────────────
  const buildQuery = useCallback((f, page, tabStatus) => {
    const params = new URLSearchParams()
    if (f.organization)     params.set('organization', f.organization)
    if (f.organizationType) params.set('organizationType', f.organizationType)
    if (f.tenderCategory)   params.set('tenderCategory', f.tenderCategory)
    if (f.district)         params.set('district', f.district)

    // The tab bar takes priority over the "Status" dropdown when active;
    // if the user picked a status dropdown value directly, respect that too.
    const expiry = tabStatus || f.expiry
    if (expiry) params.set('expiry', expiry)

    params.set('page', String(page))
    params.set('limit', String(ITEMS_PER_PAGE))
    return params.toString()
  }, [])

  const TAB_TO_STATUS = { ongoing: 'Ongoing', upcoming: 'Upcoming', completed: 'Completed', all: '' }

  // ── Core fetch: results + status counts, in parallel ─────────────────────
  const fetchTenders = useCallback(async (f, page, tab) => {
    const myRequestId = ++requestIdRef.current
    setError(null)
    setLoading(true)

    try {
      const tabStatus = TAB_TO_STATUS[tab] || ''
      const query = buildQuery(f, page, tabStatus)

      const countsParams = new URLSearchParams()
      if (f.organization)     countsParams.set('organization', f.organization)
      if (f.organizationType) countsParams.set('organizationType', f.organizationType)
      if (f.tenderCategory)   countsParams.set('tenderCategory', f.tenderCategory)
      if (f.district)         countsParams.set('district', f.district)

      const [searchRes, countsRes] = await Promise.all([
        apiFetch(`/tenders/by-organization?${query}`),
        apiFetch(`/tenders/by-organization/status-counts?${countsParams.toString()}`),
      ])

      // Ignore stale responses if a newer request has since been fired.
      if (myRequestId !== requestIdRef.current) return

      setResults(searchRes.tenders || [])
      setTotalCount(searchRes.totalCount || 0)
      setTotalPages(searchRes.totalPages || 1)
      setStatusCounts(countsRes)
      setActiveMarker(null)
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return
      console.error('Tender search failed:', err)
      setError(err.message || 'Failed to load tenders. Please try again.')
      setResults([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false)
    }
  }, [apiFetch, buildQuery])

  // ── Load all tenders on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetchTenders(EMPTY_FILTERS, 1, 'all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-search: any filter change re-runs the query (debounced) ────────
  const isFirstRun = useRef(true)
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1)
      setActiveTab('all')
      fetchTenders(filters, 1, 'all')
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  // ── Tab click: refetch immediately, no debounce ──────────────────────────
  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
    setCurrentPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    fetchTenders(filters, 1, tabId)
  }

  // ── Page change: refetch that page for the current filters/tab ──────────
  const handlePageChange = (page) => {
    setCurrentPage(page)
    fetchTenders(filters, page, activeTab)
  }

  const handleReset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setFilters(EMPTY_FILTERS)
    setActiveTab('all')
    setCurrentPage(1)
    fetchTenders(EMPTY_FILTERS, 1, 'all')
  }

  const handleCardClick = (idx, tender) => {
    setActiveMarker(idx)
    navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender, fromPath: rootPath } })
  }

  const activeFilters = Object.entries(filters).filter(([, v]) => v)
  const hasFilters = activeFilters.length > 0

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Tenders by Organisation
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Browse and filter active government tenders across Tamil Nadu by organisation.
          </p>
        </div>

        <nav className="text-xs text-tn-muted flex items-center gap-1.5" aria-label="Breadcrumb">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Tenders by Organisation</span>
        </nav>
      </div>

      {/* ── Search & Filters ────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
        <div className="space-y-4">

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <input
                type="text"
                value={filters.organization}
                onChange={(e) => setFilters((f) => ({ ...f, organization: e.target.value }))}
                placeholder="Search by organisation, title, department, district, category, or ID"
                className={TextBoxStyle}
                aria-label="Search tenders"
              />
              {loading && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="w-4 h-4 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-tn-muted underline ml-1 whitespace-nowrap self-center sm:self-auto"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SelectField
              label="Org type"
              value={filters.organizationType}
              onChange={(v) => setFilters((f) => ({ ...f, organizationType: v }))}
              options={meta.organizationTypes}
              placeholder="All types"
            />
            <SelectField
              label="Category"
              value={filters.tenderCategory}
              onChange={(v) => setFilters((f) => ({ ...f, tenderCategory: v }))}
              options={meta.categories}
              placeholder="All categories"
            />
            <SelectField
              label="District"
              value={filters.district}
              onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
              options={meta.districts}
              placeholder="All districts"
            />
            <SelectField
              label="Status"
              value={filters.expiry}
              onChange={(v) => setFilters((f) => ({ ...f, expiry: v }))}
              options={meta.statuses}
              placeholder="All statuses"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200
                          rounded-lg px-4 py-3 text-sm text-tn-danger" role="alert">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}
      </section>

      {/* ── Results header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
          <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Tender Results
        </h2>
        {!loading && (
          <span className="text-xs font-medium text-tn-muted bg-tn-light
                           px-2.5 py-1 rounded-full border border-tn-border">
            {totalCount} tender{totalCount !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* ── Tab bar (status) — counts reflect current search/filters ───────── */}
      <div className="overflow-x-auto mb-4 pb-1">
        <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
          {[
            { id: 'all',       label: 'All',       count: statusCounts.all },
            { id: 'ongoing',   label: 'Ongoing',   count: statusCounts.ongoing },
            { id: 'upcoming',  label: 'Upcoming',  count: statusCounts.upcoming },
            { id: 'completed', label: 'Completed', count: statusCounts.completed },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
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
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-tn-light text-tn-navy',
              ].join(' ')}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
        </div>
      )}

      {/* ── Results grid ─────────────────────────────────────────────────── */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {results.map((tender, idx) => (
            <div
              key={tender.id}
              ref={(el) => { cardRefs.current[idx] = el }}
              className="flex"
            >
              <TenderCard
                tender={tender}
                highlighted={activeMarker === idx}
                onClick={() => handleCardClick(idx, tender)}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* ── No results ───────────────────────────────────────────────────── */}
      {!loading && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center
                        bg-white rounded-xl border border-tn-border">
          <div className="w-14 h-14 rounded-full bg-tn-light flex items-center
                          justify-center mb-4 border border-tn-border">
            <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="font-semibold text-tn-navy mb-1">No tenders found</h3>
          <p className="text-sm text-tn-muted max-w-xs">
            No tenders match your filters. Try adjusting your search or clearing the filters.
          </p>
          <button onClick={handleReset} className="mt-4 btn-secondary text-sm">
            Reset Filters
          </button>
        </div>
      )}

    </div>
  )
}