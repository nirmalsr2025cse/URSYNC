import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApi } from '../api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'criteria1', label: 'Search Criteria I' },
  { id: 'criteria2', label: 'Search Criteria II' },
  { id: 'criteria3', label: 'Search Criteria III' },
]

const EMPTY_CRITERIA_1 = { tenderStatus: '', fromDate: '', toDate: '', tenderCategory: '', productCategory: '' }
const EMPTY_CRITERIA_2 = { organization: '', department: '', publishedFrom: '', publishedTo: '' }
const EMPTY_CRITERIA_3 = { tenderId: '' }

const ITEMS_PER_PAGE = 6
const SEARCH_DEBOUNCE_MS = 350

// ─── Reusable field components ─────────────────────────────────────────────────

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-tn-muted uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function DateField({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-tn-muted uppercase tracking-wide">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
      />
    </div>
  )
}

function hasAnyValue(values) {
  return Object.values(values).some((v) => v && v.trim() !== '')
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenderStatusPage() {
  const { apiFetch } = useApi()
  const navigate = useNavigate()
  const location = useLocation()
  const rootPath = location.state?.fromPath || location.pathname

  const [activeTab, setActiveTab] = useState('criteria1')

  const [criteria1, setCriteria1] = useState(EMPTY_CRITERIA_1)
  const [criteria2, setCriteria2] = useState(EMPTY_CRITERIA_2)
  const [criteria3, setCriteria3] = useState(EMPTY_CRITERIA_3)

  const [results,    setResults]    = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeMarker, setActiveMarker] = useState(null)
  const [statusTab, setStatusTab] = useState('all')

  const [statusCounts, setStatusCounts] = useState({ all: 0, ongoing: 0, upcoming: 0, completed: 0 })

  // Dropdown option lists, populated from real data via /status/meta.
  const [meta, setMeta] = useState({
    tenderStatuses: [],
    productCategories: [],
    tenderCategories: [],
    organizations: [],
    departments: [],
  })

  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)
  const isFirstRun = useRef(true)

  const activeValues = useMemo(() => {
    if (activeTab === 'criteria1') return criteria1
    if (activeTab === 'criteria2') return criteria2
    return criteria3
  }, [activeTab, criteria1, criteria2, criteria3])

  // No field is mandatory — the only thing that can make a search invalid
  // is a genuinely bad date range (from date later than to date).
  const isValid = useMemo(() => {
    if (activeTab === 'criteria1') {
      if (criteria1.fromDate && criteria1.toDate) return criteria1.fromDate <= criteria1.toDate
      return true
    }
    if (activeTab === 'criteria2') {
      if (criteria2.publishedFrom && criteria2.publishedTo) return criteria2.publishedFrom <= criteria2.publishedTo
      return true
    }
    return true
  }, [activeTab, criteria1, criteria2])

  // ── Load dropdown options once on mount ──────────────────────────────────
  useEffect(() => {
    apiFetch('/tenders/status/meta')
      .then((data) => setMeta(data))
      .catch((err) => console.error('Failed to load filter options:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Build query params for a given tab/values/status-tab combo ──────────
  const buildParams = useCallback((tab, f, sTab, page) => {
    const params = new URLSearchParams()

    if (tab === 'criteria1') {
      if (f.fromDate)         params.set('fromDate', f.fromDate)
      if (f.toDate)           params.set('toDate', f.toDate)
      if (f.tenderCategory)   params.set('tenderCategory', f.tenderCategory)
      if (f.productCategory)  params.set('productCategory', f.productCategory)
    } else if (tab === 'criteria2') {
      if (f.organization)     params.set('organization', f.organization)
      if (f.department)       params.set('department', f.department)
      if (f.publishedFrom)    params.set('publishedFrom', f.publishedFrom)
      if (f.publishedTo)      params.set('publishedTo', f.publishedTo)
    } else if (tab === 'criteria3') {
      if (f.tenderId)         params.set('tenderId', f.tenderId)
    }

    // The status sub-tabs (All/Ongoing/Upcoming/Completed) take priority
    // over Criteria I's own "Tender Status" dropdown when both are set —
    // otherwise fall back to whatever Criteria I picked.
    const effectiveStatus = sTab !== 'all' ? capitalize(sTab) : (tab === 'criteria1' ? f.tenderStatus : '')
    if (effectiveStatus) params.set('tenderStatus', effectiveStatus)

    params.set('page', String(page))
    params.set('limit', String(ITEMS_PER_PAGE))
    return params.toString()
  }, [])

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  // ── Fetch status counts (All/Ongoing/Upcoming/Completed) for the tab bar ─
  // No dedicated counts endpoint exists for this page, so we run 4 cheap
  // parallel calls (limit=1) against the same filters and read totalCount.
  const fetchStatusCounts = useCallback(async (tab, f) => {
    try {
      const [allRes, ongoingRes, upcomingRes, completedRes] = await Promise.all([
        apiFetch(`/tenders/status?${buildParams(tab, f, 'all', 1)}`),
        apiFetch(`/tenders/status?${buildParams(tab, f, 'ongoing', 1)}`),
        apiFetch(`/tenders/status?${buildParams(tab, f, 'upcoming', 1)}`),
        apiFetch(`/tenders/status?${buildParams(tab, f, 'completed', 1)}`),
      ])
      setStatusCounts({
        all: allRes.totalCount || 0,
        ongoing: ongoingRes.totalCount || 0,
        upcoming: upcomingRes.totalCount || 0,
        completed: completedRes.totalCount || 0,
      })
    } catch (err) {
      console.error('Failed to load status counts:', err)
    }
  }, [apiFetch, buildParams])

  // ── Core fetch: results for the current tab/filters/status-tab/page ─────
  const fetchTenders = useCallback(async (tab, f, sTab, page) => {
    if (!isValid) return
    const myRequestId = ++requestIdRef.current
    setError(null)
    setLoading(true)
    try {
      const query = buildParams(tab, f, sTab, page)
      const data = await apiFetch(`/tenders/status?${query}`)
      if (myRequestId !== requestIdRef.current) return

      setResults(data.tenders || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 1)
      setActiveMarker(null)

      // Counts reflect the criteria filters only (not the status sub-tab
      // itself), so the tab badges show the true breakdown to pick from.
      fetchStatusCounts(tab, f)
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return
      console.error('Tender status search failed:', err)
      setError(err.message || 'Failed to load tenders. Please try again.')
      setResults([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFetch, buildParams, fetchStatusCounts, isValid])

  // ── Load all tenders on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetchTenders('criteria1', EMPTY_CRITERIA_1, 'all', 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-search: debounced on every keystroke/filter change ─────────────
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchTenders(activeTab, activeValues, statusTab, 1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValues, activeTab])

  const handleTabChange = (tabId) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setActiveTab(tabId)
    setStatusTab('all')
    setCurrentPage(1)
    setActiveMarker(null)

    const freshValues = tabId === 'criteria1' ? EMPTY_CRITERIA_1 : tabId === 'criteria2' ? EMPTY_CRITERIA_2 : EMPTY_CRITERIA_3
    if (tabId === 'criteria1') setCriteria1(EMPTY_CRITERIA_1)
    if (tabId === 'criteria2') setCriteria2(EMPTY_CRITERIA_2)
    if (tabId === 'criteria3') setCriteria3(EMPTY_CRITERIA_3)

    fetchTenders(tabId, freshValues, 'all', 1)
  }

  const handleStatusTabClick = (tabId) => {
    setStatusTab(tabId)
    setCurrentPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    fetchTenders(activeTab, activeValues, tabId, 1)
  }

  const handleReset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setCriteria1(EMPTY_CRITERIA_1)
    setCriteria2(EMPTY_CRITERIA_2)
    setCriteria3(EMPTY_CRITERIA_3)
    setStatusTab('all')
    setCurrentPage(1)
    fetchTenders(activeTab, activeTab === 'criteria1' ? EMPTY_CRITERIA_1 : activeTab === 'criteria2' ? EMPTY_CRITERIA_2 : EMPTY_CRITERIA_3, 'all', 1)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    fetchTenders(activeTab, activeValues, statusTab, page)
  }

  const hasFilters = hasAnyValue(activeValues) || statusTab !== 'all'

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Tender Status
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Search government tenders using any of the criteria below.
          </p>
        </div>

        <nav className="text-xs text-tn-muted flex items-center gap-1.5" aria-label="Breadcrumb">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Tender Status</span>
        </nav>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 gap-1 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={[
                  'px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200',
                  isActive
                    ? 'bg-tn-navy text-white shadow-sm'
                    : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Search card (white bg, auto-search, no submit button) ────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">

          <div className="flex-1 min-w-0">
            {activeTab === 'criteria1' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <SelectField
                  label="Tender Status"
                  value={criteria1.tenderStatus}
                  onChange={(v) => setCriteria1((f) => ({ ...f, tenderStatus: v }))}
                  options={meta.tenderStatuses}
                  placeholder="All statuses"
                />
                <DateField
                  label="From Date"
                  value={criteria1.fromDate}
                  onChange={(v) => setCriteria1((f) => ({ ...f, fromDate: v }))}
                />
                <DateField
                  label="To Date"
                  value={criteria1.toDate}
                  onChange={(v) => setCriteria1((f) => ({ ...f, toDate: v }))}
                />
                <SelectField
                  label="Tender Category"
                  value={criteria1.tenderCategory}
                  onChange={(v) => setCriteria1((f) => ({ ...f, tenderCategory: v }))}
                  options={meta.tenderCategories}
                  placeholder="All categories"
                />
                <SelectField
                  label="Product Category"
                  value={criteria1.productCategory}
                  onChange={(v) => setCriteria1((f) => ({ ...f, productCategory: v }))}
                  options={meta.productCategories}
                  placeholder="All products"
                />
              </div>
            )}

            {activeTab === 'criteria2' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SelectField
                  label="Organization"
                  value={criteria2.organization}
                  onChange={(v) => setCriteria2((f) => ({ ...f, organization: v }))}
                  options={meta.organizations}
                  placeholder="All organizations"
                />
                <SelectField
                  label="Department"
                  value={criteria2.department}
                  onChange={(v) => setCriteria2((f) => ({ ...f, department: v }))}
                  options={meta.departments}
                  placeholder="All departments"
                />
                <DateField
                  label="Published From"
                  value={criteria2.publishedFrom}
                  onChange={(v) => setCriteria2((f) => ({ ...f, publishedFrom: v }))}
                />
                <DateField
                  label="Published To"
                  value={criteria2.publishedTo}
                  onChange={(v) => setCriteria2((f) => ({ ...f, publishedTo: v }))}
                />
              </div>
            )}

            {activeTab === 'criteria3' && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={criteria3.tenderId}
                  onChange={(e) => setCriteria3((f) => ({ ...f, tenderId: e.target.value }))}
                  placeholder="Search by Tender ID (e.g. TN-2026-0123)"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
                />
                {loading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="w-4 h-4 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clear all — inline beside the fields */}
          {hasFilters && (
            <button
              type="button"
              onClick={handleReset}
              className={`text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap self-center ${activeTab !== 'criteria3' ? 'sm:mt-4' : ''}`}
            >
              Clear all
            </button>
          )}
        </div>

        {!isValid && (
          <p className="mt-3 text-xs text-tn-danger">
            The "from" date must be on or before the "to" date.
          </p>
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

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-tn-danger" role="alert">
          {error}
        </div>
      )}

      {/* ── Status sub-tabs (All/Ongoing/Upcoming/Completed) with live counts ── */}
      {!loading && (
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
            {[
              { id: 'all',       label: 'All',       count: statusCounts.all },
              { id: 'ongoing',   label: 'Ongoing',   count: statusCounts.ongoing },
              { id: 'upcoming',  label: 'Upcoming',  count: statusCounts.upcoming },
              { id: 'completed', label: 'Completed', count: statusCounts.completed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleStatusTabClick(tab.id)}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
                  statusTab === tab.id
                    ? 'bg-tn-navy text-white shadow-sm'
                    : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
                ].join(' ')}
              >
                {tab.label}
                <span className={[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  statusTab === tab.id ? 'bg-white/20 text-white' : 'bg-tn-light text-tn-navy',
                ].join(' ')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
            <div key={tender.id} className="flex">
              <TenderCard
                tender={tender}
                className="flex-1"
                highlighted={activeMarker === idx}
                onClick={() => {
                  setActiveMarker(idx)
                  navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender, fromPath: rootPath } })
                }}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
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
            No tenders match your search criteria. Try adjusting your filters.
          </p>
          <button onClick={handleReset} className="mt-4 btn-secondary text-sm">
            Reset Filters
          </button>
        </div>
      )}

    </div>
  )
}