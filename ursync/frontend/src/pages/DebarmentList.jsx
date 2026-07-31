import React, { useState, useEffect, useCallback } from 'react'
import { useApi } from '../api/client'

// ── Theme tokens (from tailwind.config tn.* keys) ────────────────────────────
// bg-tn-cream, text-tn-navy, text-tn-muted, bg-tn-navy, text-tn-gold,
// border-tn-border, bg-tn-light, text-tn-blue, text-tn-danger

// ── Helpers ───────────────────────────────────────────────────────────────────

function Select({ value, onChange, children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none border border-tn-border rounded-md px-3 py-2
                   text-sm text-tn-navy bg-white focus:outline-none focus:ring-2
                   focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all pr-8"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-tn-muted">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  )
}

function Input({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full border border-tn-border rounded-md px-3 py-2 text-sm
                 text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2
                 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] bg-white"
    />
  )
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={onChange}
      className="w-full border border-tn-border rounded-md px-3 py-2 text-sm
                 text-tn-navy focus:outline-none focus:ring-2
                focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] bg-white"
    />
  )
}

// ── Empty / loading states ──────────────────────────────────────────────────

const SEARCH_ICON_PATH = (
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
)

function EmptyStateInitial({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-tn-amber flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <p className="text-base font-semibold text-tn-navy mb-2">{title}</p>
      <p className="text-sm text-tn-muted max-w-xs leading-relaxed">{subtitle}</p>
    </div>
  )
}

function EmptyStateNoResults({ onReset, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-tn-amber flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      </div>
      <p className="text-base font-semibold text-tn-navy mb-2">No debarred bidders found</p>
      <p className="text-sm text-tn-muted max-w-xs leading-relaxed mb-6">
        {message || 'No records match your search. Try a different Login ID or date range.'}
      </p>
      <button
        onClick={onReset}
        className="px-5 py-2 text-sm font-medium text-tn-navy border border-tn-border
                   rounded-xl bg-white hover:bg-tn-light transition-colors"
      >
        Reset Search
      </button>
    </div>
  )
}

function TableSkeleton({ cols }) {
  return (
    <div className="p-6 space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((row) => (
        <div key={row} className="flex gap-4">
          {cols.map((_, i) => (
            <div key={i} className="h-4 bg-tn-border rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Table shell ───────────────────────────────────────────────────────────────

function TableShell({ cols, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-tn-light">
            {cols.map(col => (
              <th key={col}
                className="px-4 py-3 text-xs font-semibold text-tn-navy border-b border-tn-border whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="m-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-tn-danger" role="alert">
      {message}
    </div>
  )
}

// ── Tab panels (data-driven) ─────────────────────────────────────────────────

function OrganisationTab() {
  const { apiFetch } = useApi()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch('/debarments/organisation?page=1&limit=20')
      .then((data) => { if (!cancelled) setRows(data.debarments || []) })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load organisation debarments') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cols = ['S.No', 'Bidder Name', 'Login ID', 'Organisation Chain', 'Start Date', 'End Date']

  if (loading) return <TableSkeleton cols={cols} />
  if (error) return <ErrorBanner message={error} />
  if (rows.length === 0) {
    return (
      <EmptyStateInitial
        icon={SEARCH_ICON_PATH}
        title="No organisation debarments"
        subtitle="There are currently no active debarments for organisation accounts."
      />
    )
  }

  return (
    <TableShell cols={cols}>
      {rows.map((r, idx) => (
        <tr key={r.id} className="border-b border-tn-border hover:bg-tn-light transition-colors">
          <td className="px-4 py-3 text-sm text-tn-muted">{idx + 1}</td>
          <td className="px-4 py-3 text-sm font-medium text-tn-navy">{r.bidderName}</td>
          <td className="px-4 py-3 text-sm text-tn-muted">{r.loginId}</td>
          <td className="px-4 py-3 text-sm text-tn-muted">{r.organizationChain}</td>
          <td className="px-4 py-3 text-sm text-tn-muted whitespace-nowrap">{r.startDate}</td>
          <td className="px-4 py-3 text-sm text-tn-muted whitespace-nowrap">{r.endDate}</td>
        </tr>
      ))}
    </TableShell>
  )
}

function IndividualTab() {
  const { apiFetch } = useApi()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch('/debarments/individual?page=1&limit=20')
      .then((data) => { if (!cancelled) setRows(data.debarments || []) })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load individual debarments') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cols = ['S.No', 'Bidder Name', 'PAN Number', 'Login ID', 'Product Category', 'Start Date', 'End Date']

  if (loading) return <TableSkeleton cols={cols} />
  if (error) return <ErrorBanner message={error} />
  if (rows.length === 0) {
    return (
      <EmptyStateInitial
        icon={SEARCH_ICON_PATH}
        title="No individual-account debarments"
        subtitle="There are currently no active debarments for individual accounts."
      />
    )
  }

  return (
    <TableShell cols={cols}>
      {rows.map((r, idx) => (
        <tr key={r.id} className="border-b border-tn-border hover:bg-tn-light transition-colors">
          <td className="px-4 py-3 text-sm text-tn-muted">{idx + 1}</td>
          <td className="px-4 py-3 text-sm font-medium text-tn-navy">{r.bidderName}</td>
          <td className="px-4 py-3 text-sm text-tn-muted">{r.panNumber}</td>
          <td className="px-4 py-3 text-sm text-tn-muted">{r.loginId}</td>
          <td className="px-4 py-3 text-sm text-tn-muted">{r.productCategory}</td>
          <td className="px-4 py-3 text-sm text-tn-muted whitespace-nowrap">{r.startDate}</td>
          <td className="px-4 py-3 text-sm text-tn-muted whitespace-nowrap">{r.endDate}</td>
        </tr>
      ))}
    </TableShell>
  )
}

function SearchTab() {
  const { apiFetch } = useApi()

  const [dateCriteria, setDateCriteria] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [searchId, setSearchId] = useState('')
  const [productCategory, setProductCategory] = useState('')

  const [rows, setRows] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [validationError, setValidationError] = useState(null)

  function handleClear() {
    setDateCriteria(''); setFromDate(''); setToDate('')
    setOrganisation(''); setSearchId(''); setProductCategory('')
    setSearched(false); setRows([]); setError(null); setValidationError(null)
  }

  const handleSearch = useCallback(async () => {
    // Required fields: dateCriteria, fromDate, toDate — everything else optional.
    if (!dateCriteria || !fromDate || !toDate) {
      setValidationError('Date Criteria, From Date, and To Date are all required.')
      return
    }
    if (fromDate > toDate) {
      setValidationError('From Date must be on or before To Date.')
      return
    }
    setValidationError(null)
    setError(null)
    setLoading(true)
    setSearched(true)

    try {
      const params = new URLSearchParams()
      params.set('dateCriteria', dateCriteria)
      params.set('fromDate', fromDate)
      params.set('toDate', toDate)
      if (searchId) params.set('searchId', searchId)
      if (organisation) params.set('organisation', organisation)
      if (productCategory) params.set('productCategory', productCategory)
      params.set('page', '1')
      params.set('limit', '20')

      const data = await apiFetch(`/debarments/search?${params.toString()}`)
      setRows(data.debarments || [])
    } catch (err) {
      console.error('Debarment search failed:', err)
      setError(err.message || 'Failed to search debarments. Please try again.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [apiFetch, dateCriteria, fromDate, toDate, searchId, organisation, productCategory])

  const cols = ['S.No', 'Bidder Name', 'PAN Number', 'Login ID', 'Organisation Chain', 'Product Category', 'Start Date', 'End Date']

  return (
    <div className="p-6">
      <p className="text-sm font-semibold text-tn-blue mb-1">Search</p>
      <p className="text-xs text-tn-muted mb-4">
        Date Criteria, From Date, and To Date are required. Everything else is optional.
        Search matches by Login ID across both individual and organisation accounts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-tn-muted mb-1">
            Date Criteria <span className="text-tn-danger">*</span>
          </label>
          <Select value={dateCriteria} onChange={e => setDateCriteria(e.target.value)}>
            <option value="">-Select-</option>
            <option value="debarment_date">Debarment Date</option>
            <option value="expiry_date">Expiry Date</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">
            From Date <span className="text-tn-danger">*</span>
          </label>
          <DateInput value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">
            To Date <span className="text-tn-danger">*</span>
          </label>
          <DateInput value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs text-tn-muted mb-1">Login ID</label>
          <Input placeholder="Enter Login ID (email)" value={searchId} onChange={e => setSearchId(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">Organisation Chain</label>
          <Input placeholder="e.g. TWAD Board" value={organisation} onChange={e => setOrganisation(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">Product Category</label>
          <Input placeholder="e.g. Civil, Electrical" value={productCategory} onChange={e => setProductCategory(e.target.value)} />
        </div>
      </div>

      {validationError && (
        <p className="mt-3 text-xs text-tn-danger">{validationError}</p>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-tn-border
                     text-tn-navy rounded-md hover:bg-tn-light transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-tn-navy
                     rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div className="mt-6 border border-tn-border rounded-lg overflow-hidden">
          {loading ? (
            <TableSkeleton cols={cols} />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : rows.length === 0 ? (
            <EmptyStateNoResults onReset={handleClear} />
          ) : (
            <TableShell cols={cols}>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-b border-tn-border hover:bg-tn-light transition-colors">
                  <td className="px-4 py-3 text-sm text-tn-muted">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-tn-navy">{r.bidderName}</td>
                  <td className="px-4 py-3 text-sm text-tn-muted">{r.panNumber}</td>
                  <td className="px-4 py-3 text-sm text-tn-muted">{r.loginId}</td>
                  <td className="px-4 py-3 text-sm text-tn-muted">{r.organizationChain}</td>
                  <td className="px-4 py-3 text-sm text-tn-muted">{r.productCategory}</td>
                  <td className="px-4 py-3 text-sm text-tn-muted whitespace-nowrap">{r.startDate}</td>
                  <td className="px-4 py-3 text-sm text-tn-muted whitespace-nowrap">{r.endDate}</td>
                </tr>
              ))}
            </TableShell>
          )}
        </div>
      )}
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-1 text-xs">
      <a href="/" className="text-tn-blue hover:underline">Home</a>
      <svg className="w-3 h-3 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="text-tn-navy font-medium">Debarment List</span>
    </nav>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'Individual',   label: 'Individual'   },
  { key: 'Organisation', label: 'Organisation' },
  { key: 'Search',       label: 'Search'       },
]

export default function DebarmentList() {
  const { apiFetch } = useApi()
  const [activeTab, setActiveTab] = useState('Individual')
  const [counts, setCounts] = useState({ individual: 0, organization: 0 })

  // Live counts for both tab badges, in one call.
  useEffect(() => {
    let cancelled = false
    apiFetch('/debarments/counts')
      .then((data) => { if (!cancelled) setCounts(data) })
      .catch(() => { /* badges just stay 0 on failure, non-critical */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tabs = TABS.map((t) => {
    if (t.key === 'Individual') return { ...t, count: counts.individual }
    if (t.key === 'Organisation') return { ...t, count: counts.organization }
    return { ...t, count: null } // Search tab has no badge
  })

  return (
    <div className="min-h-screen bg-tn-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-tn-navy mb-1">Debarment List</h1>
            <p className="text-sm text-tn-muted">
              View bidders and organisations currently debarred from participating in tenders.
            </p>
          </div>
          <Breadcrumb />
        </div>

        {/* Tab bar — separate card */}
        <div className="overflow-x-auto mb-3 pb-1">
          <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
            {tabs.map(({ key, label, count }) => {
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-tn-navy text-white shadow-sm'
                      : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
                  ].join(' ')}
                >
                  {label}
                  {count !== null && (
                    <span className={[
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-white/20 text-white' : 'bg-tn-light text-tn-navy',
                    ].join(' ')}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content — separate card */}
        <div className="bg-white rounded-xl border border-tn-border shadow-sm overflow-hidden">
          {activeTab === 'Individual'   && <IndividualTab />}
          {activeTab === 'Organisation' && <OrganisationTab />}
          {activeTab === 'Search'       && <SearchTab />}
        </div>

      </div>
    </div>
  )
}