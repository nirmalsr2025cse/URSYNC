import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import TenderCard from '../components/TenderCard'
import { APPLY_TENDERS, CATEGORIES, DEPARTMENTS, DISTRICTS, APPLICATION_STATUS_CONFIG } from '../data/applyTenderMockData'

const TABS = [
  { id: 'Open',     label: 'Open'     },
  { id: 'Upcoming', label: 'Upcoming' },
]

const PAGE_SIZE = 6

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-[#FFE5BF] bg-white text-[#0A2240] hover:bg-[#FFF2DB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={[
            'w-8 h-8 text-xs font-bold rounded-xl transition-colors',
            currentPage === p
              ? 'bg-[#0A2240] text-white shadow-sm'
              : 'border border-[#FFE5BF] bg-white text-[#0A2240] hover:bg-[#FFF2DB]',
          ].join(' ')}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-[#FFE5BF] bg-white text-[#0A2240] hover:bg-[#FFF2DB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

function AppStatusBadge({ status }) {
  const sc = APPLICATION_STATUS_CONFIG[status] || APPLICATION_STATUS_CONFIG['Not Applied']
  return (
    <span className={['inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full', sc.bg, sc.text].join(' ')}>
      <span className={['w-1.5 h-1.5 rounded-full flex-shrink-0', sc.dot].join(' ')} />
      {status}
    </span>
  )
}

function isDeadlinePassed(deadline) {
  return new Date(deadline) < new Date()
}

export default function ApplyTenders() {
  const navigate = useNavigate()

  const [activeTab,    setActiveTab]    = useState('Open')
  const [currentPage,  setCurrentPage]  = useState(1)
  const [animating,    setAnimating]    = useState(false)
  const [search,       setSearch]       = useState('')
  const [dept,         setDept]         = useState('All')
  const [district,     setDistrict]     = useState('All')
  const [category,     setCategory]     = useState('All')
  const [sortBy,       setSortBy]       = useState('newest')

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setCurrentPage(1)
    setTimeout(() => { setActiveTab(id); setAnimating(false) }, 150)
  }

  function handleClear() {
    setSearch(''); setDept('All'); setDistrict('All')
    setCategory('All'); setSortBy('newest'); setCurrentPage(1)
  }

  const filtered = useMemo(() => {
    let list = APPLY_TENDERS.filter((t) => t.status === activeTab)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) =>
        t.projectName.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.organization.toLowerCase().includes(q)
      )
    }
    if (dept     !== 'All') list = list.filter((t) => t.department === dept)
    if (district !== 'All') list = list.filter((t) => t.district   === district)
    if (category !== 'All') list = list.filter((t) => t.category   === category)

    if (sortBy === 'newest')   list = [...list].sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    if (sortBy === 'oldest')   list = [...list].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    if (sortBy === 'value_hi') list = [...list].sort((a, b) => parseInt(b.estimatedValue.replace(/,/g, '')) - parseInt(a.estimatedValue.replace(/,/g, '')))
    if (sortBy === 'value_lo') list = [...list].sort((a, b) => parseInt(a.estimatedValue.replace(/,/g, '')) - parseInt(b.estimatedValue.replace(/,/g, '')))
    if (sortBy === 'deadline') list = [...list].sort((a, b) => new Date(a.applicationDeadline) - new Date(b.applicationDeadline))

    return list
  }, [activeTab, search, dept, district, category, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const hasFilters = search || dept !== 'All' || district !== 'All' || category !== 'All'

  const selectClass = "px-3 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all cursor-pointer"

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Apply Tenders</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            Browse available tenders and submit applications for government projects.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7A8D]">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#1A4A8C] font-semibold">Apply Tenders</span>
        </nav>
      </div>

      {/* ── Search & Filters ───────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              placeholder="Search by tender name, ID, organization..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A8D] hover:text-[#0A2240]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="deadline">Deadline Soon</option>
            <option value="value_hi">Value: High to Low</option>
            <option value="value_lo">Value: Low to High</option>
          </select>
        </div>

        {/* Second filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={dept} onChange={(e) => { setDept(e.target.value); setCurrentPage(1) }} className={selectClass + ' flex-1'}>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
          <select value={district} onChange={(e) => { setDistrict(e.target.value); setCurrentPage(1) }} className={selectClass}>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>)}
          </select>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setCurrentPage(1) }} className={selectClass}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          {hasFilters && (
            <button
                type="button"
                onClick={handleClear}
                className="text-xs text-tn-muted hover:text-tn-danger underline ml-1"
              >
                Clear all
              </button>
          )}
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex w-full sm:w-auto items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const count = APPLY_TENDERS.filter((t) => t.status === tab.id).length
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={[
                  'flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-[#0A2240] text-white shadow-sm'
                    : 'text-[#1A4A8C] border border-[#FFE5BF] bg-transparent hover:bg-[#FFF2DB]',
                ].join(' ')}
              >
                {tab.label}
                <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded-full ',
                  isActive ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]'].join(' ')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-start">
          <span className="text-xs font-medium text-[#6B7A8D] bg-white border border-[#FFE5BF] px-3 py-1.5 rounded-full whitespace-nowrap">
            {filtered.length} tender{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Cards Grid ────────────────────────────────────────────────── */}
      <div className={[
        'transition-opacity duration-150',
        animating ? 'opacity-0' : 'opacity-100',
      ].join(' ')}>
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
            <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
              <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-bold text-[#0A2240] mb-1">No tenders found</p>
            <p className="text-sm text-[#6B7A8D]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {paginated.map((tender) => {
              const closed = isDeadlinePassed(tender.applicationDeadline)
              return (
                <div key={tender.id} className="flex flex-col">
                  {/* Application status badge above card */}
                  <div className="flex items-center justify-between mb-1 px-1">
                    {activeTab === 'Upcoming'
                        ? <div />
                        : <AppStatusBadge status={tender.applicationStatus} />
                    }
                    {closed && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Application Closed
                        </span>
                    )}
                    </div>
                  {/* TenderCard — reused as-is */}
                  <TenderCard
                    tender={{ ...tender, status: activeTab === 'Open' ? 'Open' : 'Upcoming' }}
                    viewMode="grid"
                    className="flex-1"
                    onClick={() => {}}
                  />

                {/* Buttons — Apply only for Open, nothing for Upcoming */}
                {activeTab === 'Open' && (
                <div className="flex gap-2 mt-2">
                    <button
                    onClick={() => navigate('/apply-tenders/apply', { state: { tenderId: tender.id } })}
                    disabled={closed}
                    title={closed ? 'Application Closed' : 'Apply for this tender'}
                    className={[
                        'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-colors',
                        closed
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-[#1A4A8C] text-white',
                    ].join(' ')}
                    >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {closed ? 'Application Closed' : 'Apply'}
                    </button>
                </div>
                )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}