import React, { useState } from 'react'

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

// ── Empty state: before search (image 1 style) ────────────────────────────────

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

// ── Empty state: no results after search (image 2 style) ──────────────────────

function EmptyStateNoResults({ onReset }) {
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
        No records match your search. Try different filters or a different Login ID / PAN.
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

// ── Tab panels ────────────────────────────────────────────────────────────────

const SEARCH_ICON_PATH = (
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
)

function ProductCategoryTab() {
  return (
    <EmptyStateInitial
      icon={SEARCH_ICON_PATH}
      title="Search for a bidder"
      subtitle="Use the Search tab or filters above to look up debarred bidders by product category."
    />
  )
}

function TenderCategoryTab() {
  return (
    <EmptyStateInitial
      icon={SEARCH_ICON_PATH}
      title="Search for a bidder"
      subtitle="Use the Search tab or filters above to look up debarred bidders by tender category."
    />
  )
}

function OrganisationTab() {
  const rows = [
    {
      id: 1,
      bidder: 'HariRam Constructions',
      login: 'harXXX[at]gmail[dot]com',
      chain: 'Tamil Nadu Small Industries Development Corporation Limited||SE Construction Wing',
      start: '22-Mar-2025',
      end: '25-Feb-2030',
    },
    {
      id: 2,
      bidder: 'SRI KOTTAI MARIAMMAN DEVASTHANAM',
      login: 'sriXXX[at]gmail[dot]com',
      chain: 'Hindu Religious and Charitable Endowments||Joint Commissioner office - Dindukal||Arulmigu Kottai Mariyamman Temple - Dindigul',
      start: '30-Sep-2024',
      end: '22-Sep-2049',
    },
    {
      id: 3,
      bidder: 'Sri Mariamman Steel',
      login: 'sriXXX[at]gmail[dot]com',
      chain: 'State Express Transport Corporation Tamilnadu Limited||Chennai-Materials||Trichy-Central Workshop',
      start: '12-Dec-2024',
      end: '31-Dec-2026',
    },
  ]

  const cols = ['S.No', 'Bidder Name', 'Login ID', 'Organisation Chain', 'Start Date', 'End Date', 'View']

  return (
    <TableShell cols={cols}>
      {rows.map(r => (
        <tr key={r.id} className="border-b border-tn-border hover:bg-tn-light transition-colors">
          <td className="px-4 py-3 text-sm text-tn-muted">{r.id}</td>
          <td className="px-4 py-3 text-sm font-medium text-tn-navy">{r.bidder}</td>
          <td className="px-4 py-3 text-sm text-tn-muted">{r.login}</td>
          <td className="px-4 py-3 text-sm text-tn-muted">{r.chain}</td>
          <td className="px-4 py-3 text-sm text-tn-muted whitespace-nowrap">{r.start}</td>
          <td className="px-4 py-3 text-sm text-tn-muted whitespace-nowrap">{r.end}</td>
          <td className="px-4 py-3 text-center">
            <button className="text-tn-blue hover:opacity-70 transition-opacity" title="View">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </td>
        </tr>
      ))}
    </TableShell>
  )
}

function AgainstPortalTab() {
  return (
    <EmptyStateInitial
      icon={SEARCH_ICON_PATH}
      title="Search for a bidder"
      subtitle="Use the Search tab or filters above to look up bidders debarred against a portal."
    />
  )
}

function SearchTab({ searchBy }) {
  const [dateCriteria, setDateCriteria] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [tenderCategory, setTenderCategory] = useState('')
  const [searchId, setSearchId] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [searched, setSearched] = useState(false)

  const idLabel = searchBy === 'PAN' ? 'PAN' : 'Login ID'
  const idPlaceholder = searchBy === 'PAN' ? 'Enter PAN' : 'Enter Login ID'

  function handleClear() {
    setDateCriteria(''); setFromDate(''); setToDate('')
    setOrganisation(''); setTenderCategory(''); setSearchId('')
    setProductCategory(''); setSearched(false)
  }

  return (
    <div className="p-6">
      <p className="text-sm font-semibold text-tn-blue mb-4">Search</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-tn-muted mb-1">Date Criteria</label>
          <Select value={dateCriteria} onChange={e => setDateCriteria(e.target.value)}>
            <option value="">-Select-</option>
            <option value="debarment_date">Debarment Date</option>
            <option value="expiry_date">Expiry Date</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">From Date</label>
          <DateInput value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">To Date</label>
          <DateInput value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">Organisation</label>
          <Select value={organisation} onChange={e => setOrganisation(e.target.value)}>
            <option value="">-Select-</option>
            <option value="tnsidc">TNSIDC</option>
            <option value="setc">SETC</option>
            <option value="hrce">HRCE</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">Tender Category</label>
          <Select value={tenderCategory} onChange={e => setTenderCategory(e.target.value)}>
            <option value="">-Select-</option>
            <option value="works">Works</option>
            <option value="goods">Goods</option>
            <option value="services">Services</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">{idLabel}</label>
          <Input placeholder={idPlaceholder} value={searchId} onChange={e => setSearchId(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-tn-muted mb-1">Product Category</label>
          <Select value={productCategory} onChange={e => setProductCategory(e.target.value)}>
            <option value="">-Select-</option>
            <option value="civil">Civil</option>
            <option value="electrical">Electrical</option>
            <option value="mechanical">Mechanical</option>
          </Select>
        </div>
      </div>

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
          onClick={() => setSearched(true)}
          className="flex items-center gap-1.5 px-5 py-2 text-sm text-tn-gold bg-tn-navy
                     rounded-md font-medium hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div className="mt-6 border border-tn-border rounded-lg overflow-hidden">
          <EmptyStateNoResults onReset={handleClear} />
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
  { key: 'Product Category', label: 'Product Category', count: 0  },
  { key: 'Tender Category',  label: 'Tender Category',  count: 0  },
  { key: 'Organisation',     label: 'Organisation',     count: 3  },
  { key: 'Against Portal',   label: 'Against Portal',   count: 0  },
  { key: 'Search',           label: 'Search',           count: null },
]

export default function DebarmentList() {
  const [searchBy, setSearchBy] = useState('Login ID')
  const [activeTab, setActiveTab] = useState('Product Category')

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

        {/* Search By card */}
        <div className="bg-white rounded-xl border border-tn-border shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold text-sm text-tn-navy">Debarment List</span>
          </div>
          <div>
            <label className="block text-xs text-tn-muted mb-1">Search By</label>
            <Select value={searchBy} onChange={e => setSearchBy(e.target.value)} className="max-w-xs">
              <option value="Login ID">Login ID</option>
              <option value="PAN">PAN</option>
            </Select>
          </div>
        </div>

        {/* Tab bar — separate card */}
        <div className="overflow-x-auto mb-3 pb-1">
          <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
            {TABS.map(({ key, label, count }) => {
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
          {activeTab === 'Product Category' && <ProductCategoryTab />}
          {activeTab === 'Tender Category'  && <TenderCategoryTab />}
          {activeTab === 'Organisation'     && <OrganisationTab />}
          {activeTab === 'Against Portal'   && <AgainstPortalTab />}
          {activeTab === 'Search'           && <SearchTab searchBy={searchBy} />}
        </div>

      </div>
    </div>
  )
}