import React, { useState, useRef } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import { tenders } from '../data/tenders'
import Pagination from '../components/Pagination'
import { useNavigate , useLocation } from 'react-router-dom'

// ─── Flatten tenders.js { ongoing, upcoming, completed } → flat array ─────────

const TextBoxStyle = "w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"

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

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  organization:     '',
  organizationType: '',
  tenderCategory:   '',
  district:         '',
  expiry:           '',
}

const ORG_TYPES      = ['Government Department', 'Corporation', 'Board', 'Municipality', 'Panchayat Union']
const TENDER_CATS    = ['Construction', 'Infrastructure', 'Water Supply', 'Electricity', 'IT Services',
                        'Agriculture', 'Energy', 'Healthcare', 'Urban Development', 'Education', 'Housing']
const EXPIRY_OPTIONS = ['Ongoing', 'Upcoming', 'Completed']
const DISTRICTS      = [...new Set(allTenders.map((t) => t.district).filter(Boolean))].sort()


// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchOrgType(name, type) {
  const n = name.toLowerCase()
  const map = {
    'Government Department': ['department', 'highways', 'rural'],
    'Corporation':           ['corporation'],
    'Board':                 ['board', 'twad', 'tangedco'],
    'Municipality':          ['municipality', 'municipal'],
    'Panchayat Union':       ['panchayat'],
  }
  return (map[type] || []).some((kw) => n.includes(kw))
}

function matchCategory(dept, cat) {
  const d = (dept || '').toLowerCase()
  const map = {
    'Construction':      ['construction', 'roads', 'buildings', 'bridge'],
    'Infrastructure':    ['infrastructure', 'highway', 'flyover'],
    'Water Supply':      ['water', 'drainage', 'sanitation'],
    'Electricity':       ['electrical', 'energy', 'solar', 'power', 'tangedco'],
    'IT Services':       ['it', 'smart', 'digital'],
    'Agriculture':       ['agriculture', 'farm'],
    'Energy':            ['energy', 'solar', 'power', 'tangedco', 'electrical'],
    'Healthcare':        ['health', 'hospital', 'medical', 'ambulance', 'phc'],
    'Urban Development': ['urban', 'municipal', 'corporation', 'park', 'street'],
    'Education':         ['education', 'school', 'classroom'],
    'Housing':           ['housing', 'tnhb', 'ews'],
  }
  return (map[cat] || []).some((kw) => d.includes(kw))
}

function applyFilters(data, f) {
  return data.filter((t) => {
    if (f.organization     && !t.organizationName.toLowerCase().includes(f.organization.toLowerCase())) return false
    if (f.organizationType && !matchOrgType(t.organizationName, f.organizationType))                    return false
    if (f.tenderCategory   && !matchCategory(t.department || t.category || '', f.tenderCategory))       return false
    if (f.district         && t.district !== f.district)                                                 return false
    if (f.expiry           && t.status   !== f.expiry)                                                   return false
    return true
  })
}

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
  const [filters,     setFilters]     = useState(EMPTY_FILTERS)
  const [results,     setResults]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [searched,    setSearched]    = useState(false)
  const [activeMarker,setActiveMarker]= useState(null)
  const [error,       setError]       = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('all')
  const navigate = useNavigate()
  const location = useLocation()

  const tabTenders = activeTab === 'all'       ? results
                 : activeTab === 'ongoing'   ? results.filter((t) => t.status === 'Ongoing')
                 : activeTab === 'upcoming'  ? results.filter((t) => t.status === 'Upcoming')
                 : activeTab === 'completed' ? results.filter((t) => t.status === 'Completed')
                 : results

  const cardRefs = useRef({})

  const rootPath = location.state?.fromPath||location.pathname

  const handleSearch = (e) => {
    e?.preventDefault()
    setError(null)
    setLoading(true)
    setSearched(true)
    setActiveTab('all')
    setActiveMarker(null)

    setTimeout(() => {
      setResults(applyFilters(allTenders, filters))
      setCurrentPage(1)
      setLoading(false)
    }, 600)
  }

  const handleReset = () => {
    setFilters(EMPTY_FILTERS)
    setResults([])
    setSearched(false)
    setActiveMarker(null)
    setError(null)
  }

  const handleCardClick = (idx, tender) => {
    setActiveMarker(idx)
    navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender , fromPath:rootPath } })
  }

  const ITEMS_PER_PAGE = 6
  const totalPages = Math.ceil(tabTenders.length / ITEMS_PER_PAGE)

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
        <form onSubmit={handleSearch} className="space-y-4">

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
                placeholder="Search by organisation name (e.g., TWAD Board)"
                className={TextBoxStyle}
                aria-label="Organisation name"
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary flex items-center justify-center gap-2 min-w-[120px] focus:outline-none focus:ring-0"
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
            {hasFilters && (
            <button
                type="button"
                onClick={handleReset}
                className="text-xs text-tn-muted  underline ml-1"
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
              options={ORG_TYPES}
              placeholder="All types"
              className={TextBoxStyle}
            />
            <SelectField
              label="Category"
              value={filters.tenderCategory}
              onChange={(v) => setFilters((f) => ({ ...f, tenderCategory: v }))}
              options={TENDER_CATS}
              placeholder="All categories"
              className={TextBoxStyle}
            />
            <SelectField
              label="District"
              value={filters.district}
              onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
              options={DISTRICTS}
              placeholder="All districts"
              className={TextBoxStyle}
            />
            <SelectField
              label="Status"
              value={filters.expiry}
              onChange={(v) => setFilters((f) => ({ ...f, expiry: v }))}
              options={EXPIRY_OPTIONS}
              placeholder="All statuses"
              className={TextBoxStyle}
            />
          </div>
        </form>

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
        {results.length > 0 && !loading && (
          <span className="text-xs font-medium text-tn-muted bg-tn-light
                           px-2.5 py-1 rounded-full border border-tn-border">
            {results.length} tender{results.length !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="overflow-x-auto mb-4 pb-1">
          <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
            {[
              { id: 'all',       label: 'All',       count: results.length },
              { id: 'ongoing',   label: 'Ongoing',   count: results.filter((t) => t.status === 'Ongoing').length },
              { id: 'upcoming',  label: 'Upcoming',  count: results.filter((t) => t.status === 'Upcoming').length },
              { id: 'completed', label: 'Completed', count: results.filter((t) => t.status === 'Completed').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1) }}
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
      )}

      {/* ── Results grid ─────────────────────────────────────────────────── */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {tabTenders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((tender, idx) => (
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* ── No results ───────────────────────────────────────────────────── */}
      {!loading && searched && results.length === 0 && !error && (
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

      {/* ── Pre-search empty state ────────────────────────────────────────── */}
      {!searched && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center
                        bg-white rounded-xl border border-dashed border-tn-border">
          <div className="w-14 h-14 rounded-full bg-tn-light flex items-center
                          justify-center mb-4 border border-tn-border">
            <svg className="w-7 h-7 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-tn-navy mb-1">Search for an organisation</h3>
          <p className="text-sm text-tn-muted max-w-xs">
            Enter an organisation name or use the filters above to browse tenders across Tamil Nadu.
          </p>
        </div>
      )}

    </div>
  )
}