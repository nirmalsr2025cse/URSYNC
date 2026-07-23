//src/pages/TenderByClassification.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate , useLocation } from 'react-router-dom'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { tenders } from '../data/tenders'

// ─── Flatten tenders ──────────────────────────────────────────────────────────
const STATUS_MAP = {
  ongoing:   'Ongoing',
  upcoming:  'Upcoming',
  completed: 'Completed',
}

const allTenders = Object.entries(tenders).flatMap(([key, list]) =>
  (list || []).map((t) => ({
    ...t,
    status:           t.status || STATUS_MAP[key] || 'Open',
    organizationName: t.organizationName || t.organization || '',
    district:         t.district || t.location || '',
  }))
)

// ─── Unique filter options ────────────────────────────────────────────────────
const CLASSIFICATIONS  = [...new Set(allTenders.map(t => t.classification).filter(Boolean))].sort()
const TENDER_CATS      = [...new Set(allTenders.map(t => t.category).filter(Boolean))].sort()
const PRODUCT_CATS     = [...new Set(allTenders.map(t => t.productCategory).filter(Boolean))].sort()
const ORG_TYPES        = [...new Set(allTenders.map(t => t.organizationType).filter(Boolean))].sort()
const DISTRICTS        = [...new Set(allTenders.map(t => t.district).filter(Boolean))].sort()
const STATUS_OPTIONS   = ['Ongoing', 'Upcoming', 'Completed']
const SORT_OPTIONS     = ['Latest', 'Closing Soon', 'Value: High to Low', 'Value: Low to High', 'Alphabetical']

const VALUE_RANGES = [
  { label: 'Below ₹10 Lakh',       min: 0,         max: 1000000    },
  { label: '₹10–50 Lakh',          min: 1000000,   max: 5000000    },
  { label: '₹50 Lakh–₹1 Crore',    min: 5000000,   max: 10000000   },
  { label: '₹1–5 Crore',           min: 10000000,  max: 50000000   },
  { label: 'Above ₹5 Crore',       min: 50000000,  max: Infinity   },
]

const POPULAR_CHIPS = [
  'Construction', 'Infrastructure', 'Water Supply', 'Electricity',
  'IT Services', 'Agriculture', 'Energy', 'Healthcare', 'Education', 'Housing',
]

const EMPTY_FILTERS = {
  classification: '', category: '', productCategory: '',
  organizationType: '', district: '', status: '', valueRange: '',
}

const ITEMS_PER_PAGE = 6

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
  const navigate = useNavigate()
  const location = useLocation()

  const [keyword,        setKeyword]        = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [activeChip,     setActiveChip]     = useState('')
  const [filters,        setFilters]        = useState(EMPTY_FILTERS)
  const [sortBy,         setSortBy]         = useState('Latest')
  const [currentPage,    setCurrentPage]    = useState(1)
  const [searching,      setSearching]      = useState(false)
  const [activeMarker, setActiveMarker] = useState(null)

  // Only true once the user has actually triggered a search
  // (Search button / Enter, or a popular-category chip).
  // Drives whether we show the blank "search to see results" state
  // or the actual results grid.
  const [hasSearched, setHasSearched] = useState(false)

  const rootPath = location.state?.fromPath||location.pathname

  function handleSearch() {
    setSearching(true)
    setTimeout(() => {
      setAppliedKeyword(keyword)
      setCurrentPage(1)
      setSearching(false)
      setHasSearched(true)
    }, 500)
  }

  function handleChip(chip) {
    const next = activeChip === chip ? '' : chip
    setActiveChip(next)
    setKeyword(next)
    setAppliedKeyword(next)
    setCurrentPage(1)
    setHasSearched(true)
  }

  function handleReset() {
    setKeyword(''); 
    setAppliedKeyword(''); 
    setActiveChip('')
    setFilters(EMPTY_FILTERS); 
    setSortBy('Latest'); 
    setCurrentPage(1)
    setHasSearched(false)
  }

  function setF(key) {
    return (val) => { setFilters((f) => ({ ...f, [key]: val })); setCurrentPage(1) }
  }

  const filtered = useMemo(() => {
    let list = [...allTenders]

    if (appliedKeyword.trim()) {
      const q = appliedKeyword.toLowerCase()
      list = list.filter((t) =>
        t.id?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.organizationName?.toLowerCase().includes(q) ||
        t.department?.toLowerCase().includes(q) ||
        t.district?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      )
    }

    if (filters.classification)  list = list.filter(t => t.classification  === filters.classification)
    if (filters.category)        list = list.filter(t => t.category         === filters.category)
    if (filters.productCategory) list = list.filter(t => t.productCategory  === filters.productCategory)
    if (filters.organizationType)list = list.filter(t => t.organizationType === filters.organizationType)
    if (filters.district)        list = list.filter(t => t.district         === filters.district)
    if (filters.status)          list = list.filter(t => t.status           === filters.status)

    if (filters.valueRange) {
      const range = VALUE_RANGES.find(r => r.label === filters.valueRange)
      if (range) {
        list = list.filter(t => {
          const val = parseFloat(String(t.estimatedValue || t.value || '0').replace(/[^0-9.]/g, ''))
          return val >= range.min && val < range.max
        })
      }
    }

    switch (sortBy) {
      case 'Closing Soon':        list.sort((a, b) => new Date(a.closingDate) - new Date(b.closingDate)); break
      case 'Value: High to Low':  list.sort((a, b) => parseFloat(b.estimatedValue || 0) - parseFloat(a.estimatedValue || 0)); break
      case 'Value: Low to High':  list.sort((a, b) => parseFloat(a.estimatedValue || 0) - parseFloat(b.estimatedValue || 0)); break
      case 'Alphabetical':        list.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break
      default:                    list.sort((a, b) => new Date(b.publishedDate || b.date || 0) - new Date(a.publishedDate || a.date || 0))
    }

    return list
  }, [appliedKeyword, filters, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const hasFilters = appliedKeyword || Object.values(filters).some(Boolean)

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
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search Tender ID, Title, Organisation, Category..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="btn-primary flex items-center justify-center gap-2 min-w-[120px] focus:outline-none focus:ring-0"
          >
            {searching ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </>
            )}
          </button>
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
        <SelectField label="Classification"    value={filters.classification}   onChange={setF('classification')}   options={CLASSIFICATIONS.length ? CLASSIFICATIONS : ['Works', 'Goods', 'Services']} />
        <SelectField label="Tender Category"   value={filters.category}         onChange={setF('category')}         options={TENDER_CATS} />
        <SelectField label="Product Category"  value={filters.productCategory}  onChange={setF('productCategory')}  options={PRODUCT_CATS} />
        <SelectField label="Organisation Type" value={filters.organizationType} onChange={setF('organizationType')} options={ORG_TYPES} />
        <SelectField label="District"          value={filters.district}         onChange={setF('district')}         options={DISTRICTS} />
        <SelectField label="Status"            value={filters.status}           onChange={setF('status')}           options={STATUS_OPTIONS} />
        <SelectField label="Estimated Value"   value={filters.valueRange}       onChange={setF('valueRange')}       options={VALUE_RANGES.map(r => r.label)} />
        <SelectField label="Sort By"           value={sortBy}                   onChange={(v) => { setSortBy(v); setCurrentPage(1) }} options={SORT_OPTIONS} />
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
        {hasSearched && (
          <span className="text-xs font-medium text-tn-muted bg-tn-light px-2.5 py-1 rounded-full border border-tn-border">
            {filtered.length} tender{filtered.length !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* ── Results Grid / Empty States ───────────────────────────────── */}
      {searching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
        </div>
      )}

      {!searching && !hasSearched && (
        // ── Prompt-to-search state (matches Cancelled/Retendered pattern) ──
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-dashed border-tn-border">
          <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
            <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-bold text-tn-navy mb-1">Search for tenders</h3>
          <p className="text-sm text-tn-muted max-w-xs">
            Enter a keyword above, pick a popular category, or click Search to find matching tenders.
          </p>
        </div>
      )}

      {!searching && hasSearched && filtered.length === 0 && (
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

      {!searching && hasSearched && filtered.length > 0 && (
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
                  navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender , fromPath:rootPath } })
                }}
              />
            </div>
          ))}
        </div>
      )}

      {hasSearched && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}