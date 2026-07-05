import React, { useState, useMemo } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { tenders } from '../data/tenders'
import { useNavigate , useLocation} from 'react-router-dom'

// ─── Flatten tenders.js { ongoing, upcoming, completed } → flat array ─────────

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

const TABS = [
  { id: 'criteria1', label: 'Search Criteria I' },
  { id: 'criteria2', label: 'Search Criteria II' },
  { id: 'criteria3', label: 'Search Criteria III' },
]

const TENDER_STATUS_OPTIONS = ['Ongoing', 'Upcoming', 'Completed']
const TENDER_CATS  = ['Construction', 'Infrastructure', 'Water Supply', 'Electricity', 'IT Services',
                       'Agriculture', 'Energy', 'Healthcare', 'Urban Development', 'Education', 'Housing']
const PRODUCT_CATS = ['Goods', 'Works', 'Services', 'Consultancy']
const ORGANIZATIONS = [...new Set(allTenders.map((t) => t.organizationName).filter(Boolean))].sort()
const DEPARTMENTS   = [...new Set(allTenders.map((t) => t.department).filter(Boolean))].sort()

const EMPTY_CRITERIA_1 = { tenderStatus: '', fromDate: '', toDate: '', tenderCategory: '', productCategory: '' }
const EMPTY_CRITERIA_2 = { organization: '', department: '', publishedFrom: '', publishedTo: '' }
const EMPTY_CRITERIA_3 = { tenderId: '' }

const ITEMS_PER_PAGE = 6

// ─── Reusable field components ─────────────────────────────────────────────────

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

function DateField({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-tn-muted uppercase tracking-wide">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
      />
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-tn-muted uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
      />
    </div>
  )
}

// ─── Filtering logic per tab ────────────────────────────────────────────────────

function inDateRange(dateStr, from, to) {
  if (!dateStr) return !from && !to
  const d = new Date(dateStr)
  if (from && d < new Date(from)) return false
  if (to && d > new Date(to)) return false
  return true
}

function applyCriteria1(data, f) {
  return data.filter((t) => {
    if (f.tenderStatus    && t.status !== f.tenderStatus)                         return false
    if ((f.fromDate || f.toDate) && !inDateRange(t.publishedDate || t.date, f.fromDate, f.toDate)) return false
    if (f.tenderCategory  && t.category   !== f.tenderCategory)                   return false
    if (f.productCategory && t.productCategory !== f.productCategory)            return false
    return true
  })
}

function applyCriteria2(data, f) {
  return data.filter((t) => {
    if (f.organization && !t.organizationName.toLowerCase().includes(f.organization.toLowerCase())) return false
    if (f.department   && !(t.department || '').toLowerCase().includes(f.department.toLowerCase()))  return false
    if ((f.publishedFrom || f.publishedTo) &&
        !inDateRange(t.publishedDate || t.date, f.publishedFrom, f.publishedTo))                      return false
    return true
  })
}

function applyCriteria3(data, f) {
  return data.filter((t) => {
    if (f.tenderId && !String(t.id).toLowerCase().includes(f.tenderId.toLowerCase())) return false
    return true
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenderStatusPage() {
  const [activeTab, setActiveTab] = useState('criteria1')

  const [criteria1, setCriteria1] = useState(EMPTY_CRITERIA_1)
  const [criteria2, setCriteria2] = useState(EMPTY_CRITERIA_2)
  const [criteria3, setCriteria3] = useState(EMPTY_CRITERIA_3)

  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeMarker, setActiveMarker] = useState(null)
  const [statusTab, setStatusTab] = useState('all')
  const navigate = useNavigate()
  const loca1tion = useLocation()

  const rootPath = location.state?.fromPath||location.pathname

  const activeValues = useMemo(() => {
    if (activeTab === 'criteria1') return criteria1
    if (activeTab === 'criteria2') return criteria2
    return criteria3
  }, [activeTab, criteria1, criteria2, criteria3])

  const hasAnyValue = Object.values(activeValues).some((v) => v && v.trim() !== '')

  const isValid = useMemo(() => {
    if (activeTab === 'criteria1') {
        const allFilled =
        criteria1.tenderStatus &&
        criteria1.fromDate &&
        criteria1.toDate &&
        criteria1.tenderCategory &&
        criteria1.productCategory;

        if (!allFilled) return false;

        return criteria1.fromDate <= criteria1.toDate;
    }

    if (activeTab === 'criteria2') {
        const allFilled =
        criteria2.organization &&
        criteria2.department &&
        criteria2.publishedFrom &&
        criteria2.publishedTo;

        if (!allFilled) return false;

        return criteria2.publishedFrom <= criteria2.publishedTo;
    }

    return criteria3.tenderId.trim() !== '';
    }, [activeTab, criteria1, criteria2, criteria3]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setResults([])
    setSearched(false)
    setActiveMarker(null)
    setStatusTab('all')
    setCurrentPage(1)
  }

  const handleSearch = (e) => {
    e?.preventDefault()
    if (!isValid) return
    setLoading(true)
    setStatusTab('all')
    setSearched(true)

    setTimeout(() => {
      let filtered = allTenders
      if (activeTab === 'criteria1') filtered = applyCriteria1(allTenders, criteria1)
      if (activeTab === 'criteria2') filtered = applyCriteria2(allTenders, criteria2)
      if (activeTab === 'criteria3') filtered = applyCriteria3(allTenders, criteria3)

      setResults(filtered)
      setCurrentPage(1)
      setLoading(false)
    }, 500)
  }

  const handleReset = () => {
    setCriteria1(EMPTY_CRITERIA_1)
    setCriteria2(EMPTY_CRITERIA_2)
    setCriteria3(EMPTY_CRITERIA_3)
    setResults([])
    setSearched(false)
    setCurrentPage(1)
  }

  const displayResults = useMemo(() => {
    if (activeTab === 'criteria3') return results
    if (statusTab === 'all')       return results
    if (statusTab === 'ongoing')   return results.filter((t) => t.status === 'Ongoing')
    if (statusTab === 'upcoming')  return results.filter((t) => t.status === 'Upcoming')
    if (statusTab === 'completed') return results.filter((t) => t.status === 'Completed')
    return results
  }, [results, statusTab, activeTab])


  const totalPages = Math.ceil(displayResults.length / ITEMS_PER_PAGE)
  const paginated  = displayResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
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
      <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={[
                'px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200',
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

        {/* ── Tab content / search form ─────────────────────────────────── */}
        <form onSubmit={handleSearch} className="p-5 space-y-4">

          {activeTab === 'criteria1' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              <SelectField
                label="Tender Status"
                value={criteria1.tenderStatus}
                onChange={(v) => setCriteria1((f) => ({ ...f, tenderStatus: v }))}
                options={TENDER_STATUS_OPTIONS}
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
                options={TENDER_CATS}
                placeholder="All categories"
              />
              <SelectField
                label="Product Category"
                value={criteria1.productCategory}
                onChange={(v) => setCriteria1((f) => ({ ...f, productCategory: v }))}
                options={PRODUCT_CATS}
                placeholder="All products"
              />
              <div className="flex items-center gap-2 lg:col-span-1 pt-4 justify-end lg:justify-start" >
                <button type="submit" disabled={!isValid || loading}
                  className="btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Searching…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>Search</>
                  )}
                </button>
                <button type="button" onClick={handleReset}
                  className="text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap">
                  Clear all
                </button>
              </div>
            </div>
          )}

          {activeTab === 'criteria2' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 items-end gap-3">
              <SelectField
                label="Organization"
                value={criteria2.organization}
                onChange={(v) => setCriteria2((f) => ({ ...f, organization: v }))}
                options={ORGANIZATIONS}
                placeholder="All organizations"
              />
              <SelectField
                label="Department"
                value={criteria2.department}
                onChange={(v) => setCriteria2((f) => ({ ...f, department: v }))}
                options={DEPARTMENTS}
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
              <div className="flex items-center gap-2 lg:col-span-1 pb-0.5 justify-end lg:justify-start ">
                <button type="submit" disabled={!isValid || loading}
                  className="btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Searching…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>Search</>
                  )}
                </button>
                <button type="button" onClick={handleReset}
                  className="text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap">
                  Clear all
                </button>
              </div>
            </div>
          )}

          {activeTab === 'criteria3' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 items-end gap-3">
              <TextField
                label="Tender ID"
                value={criteria3.tenderId}
                onChange={(v) => setCriteria3((f) => ({ ...f, tenderId: v }))}
                placeholder="e.g. TN-2026-0123"
              />
              <div className="flex items-center gap-2 lg:col-span-1 pt-4 justify-end lg:justify-start ">
                <button type="submit" disabled={!isValid || loading}
                  className="btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Searching…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>Search</>
                  )}
                </button>
                <button type="button" onClick={handleReset}
                  className="text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap">
                  Clear all
                </button>
              </div>
            </div>
          )}
        </form>

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

      {!loading && results.length > 0 && activeTab !== 'criteria3' && (
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
            {[
              { id: 'all',       label: 'All',       count: results.length },
              { id: 'ongoing',   label: 'Ongoing',   count: results.filter((t) => t.status === 'Ongoing').length },
              { id: 'upcoming',  label: 'Upcoming',  count: results.filter((t) => t.status === 'Upcoming').length },
              { id: 'completed', label: 'Completed', count: results.filter((t) => t.status === 'Completed').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusTab(tab.id); setCurrentPage(1) }}
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

      {/* ── Results grid ─────────────────────────────────────────────────── */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {paginated.map((tender, idx) => (
            <div key={tender.id} className="flex">
              <TenderCard 
                tender={tender}
                className="flex-1"
                highlighted={activeMarker === idx}
                onClick={() => {
                  setActiveMarker(idx)
                  navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender , fromPath : rootPath } })
                }}
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
      {!loading && searched && results.length === 0 && (
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
          <h3 className="font-semibold text-tn-navy mb-1">Search for a tender</h3>
          <p className="text-sm text-tn-muted max-w-xs">
            Choose a search tab above and fill in at least one field to find tenders.
          </p>
        </div>
      )}

    </div>
  )
}