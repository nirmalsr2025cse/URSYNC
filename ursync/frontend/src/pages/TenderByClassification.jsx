// src/pages/TenderByClassification.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { useApi } from '../api/client'

const ITEMS_PER_PAGE = 6
const SEARCH_DEBOUNCE_MS = 350

const SORT_OPTIONS = ['Ongoing', 'Upcoming', 'Completed']

const VALUE_RANGES = [
  { label: 'Below ₹10 Lakh',    min: 0,        max: 1000000 },
  { label: '₹10–50 Lakh',       min: 1000000,  max: 5000000 },
  { label: '₹50 Lakh–₹1 Crore', min: 5000000,  max: 10000000 },
  { label: '₹1–5 Crore',        min: 10000000, max: 50000000 },
  { label: 'Above ₹5 Crore',    min: 50000000, max: Infinity },
]

const POPULAR_CHIPS = [
  'Construction', 'Infrastructure', 'Water Supply', 'Electricity',
  'IT Services', 'Agriculture', 'Energy', 'Healthcare', 'Education', 'Housing',
]

const EMPTY_FILTERS = {
  classification: '', category: '', productCategory: '',
  organizationType: '', district: '', valueRange: '',
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-tn-muted uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
      >
        <option value="">{placeholder || 'All'}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default function TendersByClassification() {
  const { apiFetch } = useApi()
  const navigate = useNavigate()
  const location = useLocation()

  const [keyword,     setKeyword]     = useState('')
  const [activeChip,  setActiveChip]  = useState('')
  const [filters,     setFilters]     = useState(EMPTY_FILTERS)
  const [sortBy,      setSortBy]      = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [results,    setResults]    = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [activeMarker, setActiveMarker] = useState(null)

  // Dropdown option lists populated from real data.
  const [meta, setMeta] = useState({
    classifications: [], categories: [], productCategories: [],
    organizationTypes: [], districts: [], statuses: [],
  })

  const rootPath = location.state?.fromPath || location.pathname
  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)
  const isFirstRun = useRef(true)

  // ── Load dropdown options once ────────────────────────────────────────
  useEffect(() => {
    apiFetch('/tenders/by-classification/meta')
      .then((data) => setMeta(data))
      .catch((err) => console.error('Failed to load filter options:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildQuery = useCallback((kw, f, sort, page) => {
    const params = new URLSearchParams()
    if (kw)                   params.set('keyword', kw)
    if (f.classification)     params.set('classification', f.classification)
    if (f.category)           params.set('category', f.category)
    if (f.productCategory)    params.set('productCategory', f.productCategory)
    if (f.organizationType)   params.set('organizationType', f.organizationType)
    if (f.district)           params.set('district', f.district)
    if (sort)                 params.set('status', sort) // "Sort By" dropdown now filters by status
    if (f.valueRange) {
      const range = VALUE_RANGES.find((r) => r.label === f.valueRange)
      if (range) {
        params.set('minValue', String(range.min))
        if (range.max !== Infinity) params.set('maxValue', String(range.max))
      }
    }
    params.set('page', String(page))
    params.set('limit', String(ITEMS_PER_PAGE))
    return params.toString()
  }, [])

  const fetchTenders = useCallback(async (kw, f, sort, page) => {
    const myRequestId = ++requestIdRef.current
    setError(null)
    setLoading(true)
    try {
      const query = buildQuery(kw, f, sort, page)
      const data = await apiFetch(`/tenders/by-classification?${query}`)
      if (myRequestId !== requestIdRef.current) return

      setResults(data.tenders || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 1)
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

  // ── Load all tenders on mount ─────────────────────────────────────────
  useEffect(() => {
    fetchTenders('', EMPTY_FILTERS, '', 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-search: any change to keyword/filters/sort re-runs (debounced) ─
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchTenders(keyword, filters, sortBy, 1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, filters, sortBy])

  function handleChip(chip) {
    const next = activeChip === chip ? '' : chip
    setActiveChip(next)
    setKeyword(next) // flows through the same debounced auto-search effect
  }

  function handleReset() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setKeyword('')
    setActiveChip('')
    setFilters(EMPTY_FILTERS)
    setSortBy('')
    setCurrentPage(1)
    fetchTenders('', EMPTY_FILTERS, '', 1)
  }

  function setF(key) {
    return (val) => setFilters((f) => ({ ...f, [key]: val }))
  }

  function handlePageChange(page) {
    setCurrentPage(page)
    fetchTenders(keyword, filters, sortBy, page)
  }

  const hasFilters = keyword || Object.values(filters).some(Boolean) || sortBy !== ''

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Tenders by Classification
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Browse government tenders by work classification, product category and procurement type.
          </p>
        </div>
        <nav className="text-xs text-tn-muted flex items-center gap-1.5" aria-label="Breadcrumb">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Tenders by Classification</span>
        </nav>
      </div>

      {/* ── Search Card ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => { setActiveChip(''); setKeyword(e.target.value) }}
              placeholder="Search Tender ID, Title, Organisation, Category..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="w-4 h-4 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={handleReset}
              className="text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap self-center"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Popular Chips */}
        <div>
          <p className="text-xs font-semibold text-tn-muted uppercase tracking-wide mb-2">Popular Categories</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                className={[
                  'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                  activeChip === chip
                    ? 'bg-tn-navy text-white border-tn-navy'
                    : 'bg-tn-light text-tn-blue border-tn-border hover:bg-tn-blue hover:text-white',
                ].join(' ')}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filters Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-white rounded-xl border border-tn-border p-4">
        <SelectField label="Classification"    value={filters.classification}   onChange={setF('classification')}   options={meta.classifications} />
        <SelectField label="Tender Category"   value={filters.category}         onChange={setF('category')}         options={meta.categories} />
        <SelectField label="Product Category"  value={filters.productCategory}  onChange={setF('productCategory')}  options={meta.productCategories} />
        <SelectField label="Organisation Type" value={filters.organizationType} onChange={setF('organizationType')} options={meta.organizationTypes} />
        <SelectField label="District"          value={filters.district}         onChange={setF('district')}         options={meta.districts} />
        <SelectField label="Estimated Value"   value={filters.valueRange}       onChange={setF('valueRange')}       options={VALUE_RANGES.map(r => r.label)} />
        <SelectField label="Sort By"           value={sortBy}                   onChange={setSortBy}                options={SORT_OPTIONS} />
      </div>

      {/* ── Results Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
          <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Tender Results
        </h2>
        {!loading && (
          <span className="text-xs font-medium text-tn-muted bg-tn-light px-2.5 py-1 rounded-full border border-tn-border">
            {totalCount} tender{totalCount !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-tn-danger" role="alert">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Results Grid / Empty State ────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-dashed border-tn-border">
          <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
            <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-tn-navy mb-1">No tenders found</h3>
          <p className="text-sm text-tn-muted max-w-xs">
            No tenders match your filters. Try adjusting your search or clearing filters.
          </p>
          <button onClick={handleReset} className="mt-4 btn-secondary text-sm">
            Clear Filters
          </button>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {results.map((tender, idx) => (
            <div key={tender.id} className="flex">
              <TenderCard
                tender={tender}
                viewMode="grid"
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

      {!loading && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}