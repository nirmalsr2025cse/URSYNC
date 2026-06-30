// src/pages/Applications.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { APPLICATION_TENDERS } from '../data/applicationMockData'

const TABS = [
  { id: 'Ongoing',   label: 'Ongoing'   },
  { id: 'Upcoming',  label: 'Upcoming'  },
  { id: 'Completed', label: 'Completed' },
]

function isDeadlinePassed(deadline) {
  return new Date(deadline) < new Date()
}

export default function Applications() {
  const navigate = useNavigate()
  const PAGE_SIZE = 6

  const [currentPage, setCurrentPage] = useState(1)
  const [animating,   setAnimating]   = useState(false)
  const [search,      setSearch]      = useState('')
  const [dept,        setDept]        = useState('All')
  const [district,    setDistrict]    = useState('All')
  const [category,    setCategory]    = useState('All')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [appliedDept,     setAppliedDept]     = useState('All')
  const [appliedDistrict, setAppliedDistrict] = useState('All')
  const [appliedCategory, setAppliedCategory] = useState('All')
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.fromTab || 'Ongoing')

  const DEPARTMENTS = ['All', ...new Set(APPLICATION_TENDERS.map(t => t.department))]
  const DISTRICTS   = ['All', ...new Set(APPLICATION_TENDERS.map(t => t.district))]
  const CATEGORIES  = ['All', ...new Set(APPLICATION_TENDERS.map(t => t.category))]

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setCurrentPage(1)
    setTimeout(() => { setActiveTab(id); setAnimating(false) }, 150)
  }

  function handleSearch() {
    setSearching(true)
    setTimeout(() => {
      setAppliedSearch(search)
      setCurrentPage(1)
      setSearching(false)
    }, 600)
  }

  function handleClear() {
    setSearch(''); 
    setAppliedSearch('')
    setDept('All'); 
    setDistrict('All'); 
    setCategory('All')
    setCurrentPage(1)
  }

  const searchScoped = useMemo(() => {
    return APPLICATION_TENDERS.filter((t) => {
      if (appliedSearch.trim()) {
        const q = appliedSearch.toLowerCase()
        if (!t.id.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) return false
      }
      if (dept     !== 'All' && t.department !== dept) return false
      if (district !== 'All' && t.district   !== district) return false
      if (category !== 'All' && t.category   !== category) return false
      return true
    })
  }, [appliedSearch, dept, district, category])

  const counts = useMemo(() => {
    const scoped = APPLICATION_TENDERS.filter((t) => {
      if (appliedSearch.trim()) {
        const q = appliedSearch.toLowerCase()
        if (!t.id.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) return false
      }
      if (dept     !== 'All' && t.department !== dept) return false
      if (district !== 'All' && t.district   !== district) return false
      if (category !== 'All' && t.category   !== category) return false
      return true
    })
    return {
      Ongoing:   scoped.filter(t => isDeadlinePassed(t.applicationDeadline) && !t.sentToDept).length,
      Upcoming:  scoped.filter(t => !isDeadlinePassed(t.applicationDeadline)).length,
      Completed: scoped.filter(t => t.sentToDept).length,
    }
  }, [appliedSearch, dept, district, category])

  // ── Tab-specific filtering ────────────────────────────────────────────────
  const tabFiltered = useMemo(() => {
    return APPLICATION_TENDERS.filter((t) => {
      const deadlinePassed = isDeadlinePassed(t.applicationDeadline)
      if (activeTab === 'Ongoing'   && !(deadlinePassed && !t.sentToDept)) return false
      if (activeTab === 'Upcoming'  && deadlinePassed) return false
      if (activeTab === 'Completed' && !t.sentToDept) return false

      if (appliedSearch.trim()) {
        const q = appliedSearch.toLowerCase()
        if (!t.id.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) return false
      }
      if (dept     !== 'All' && t.department !== dept) return false
      if (district !== 'All' && t.district   !== district) return false
      if (category !== 'All' && t.category   !== category) return false
      return true
    })
  }, [activeTab, appliedSearch, dept, district, category])

  // ── Search + filters ──────────────────────────────────────────────────────
  const filtered = tabFiltered

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage, PAGE_SIZE])


  const hasFilters = appliedSearch || dept !== 'All' || district !== 'All' || category !== 'All'
  const selectClass = "px-3 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all cursor-pointer"

  const EMPTY_TEXT = {
    Ongoing:   'No completed application tenders.',
    Upcoming:  'No applications available for review.',
    Completed: 'No finalized tenders.',
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in">

      {/* ── Header + Breadcrumb ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Applications</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            Review and finalize applications submitted for government tenders.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7A8D]">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#1A4A8C] font-semibold">Applications</span>
        </nav>
      </div>

      {/* ── Search & Filters ───────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by Tender ID or title..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? (
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
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={dept} onChange={(e) => { setDept(e.target.value); setCurrentPage(1) }} className={selectClass + ' flex-1'}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
          <select value={district} onChange={(e) => { setDistrict(e.target.value); setCurrentPage(1) }} className={selectClass}>
            {DISTRICTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>)}
          </select>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setCurrentPage(1) }} className={selectClass}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
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
      <div>
      <div className="flex items-center justify-between gap-4 flex-wrap overflow-auto">
        <div className="inline-flex items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={[
                  'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                  isActive ? 'bg-[#0A2240] text-white shadow-sm' : 'text-[#1A4A8C] border border-[#FFE5BF] bg-transparent hover:bg-[#FFF2DB]',
                ].join(' ')}
              >
                {tab.label}
                <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]'].join(' ')}>
                  {counts[tab.id]}
                </span>
              </button>
            )
          })}
        </div>
        </div>
        <div className="pt-2">
        <span className="text-xs font-medium text-[#6B7A8D] bg-white border border-[#FFE5BF] px-3 py-1.5 rounded-full">
          {filtered.length} tender{filtered.length !== 1 ? 's' : ''}
        </span>
        </div>
      </div>

      {/* ── Cards ──────────────────────────────────────────────────────── */}
      <div className={['transition-opacity duration-150', animating ? 'opacity-0' : 'opacity-100'].join(' ')}>
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
            <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
              <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-bold text-[#0A2240] mb-1">{EMPTY_TEXT[activeTab]}</p>
            <p className="text-sm text-[#6B7A8D]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {paginated.map((tender) => {
              const deadlinePassed = isDeadlinePassed(tender.applicationDeadline)
              return (
                <div key={tender.id} className="flex flex-col">
                  {activeTab === 'Completed' && (
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tender.approvedCount} Approved
                      </span>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        Sent: {new Date(tender.sentDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </span>
                    </div>
                  )}

                  <TenderCard
                    tender={{ ...tender, status: activeTab }}
                    viewMode="grid"
                    className="flex-1"
                    onClick={() => deadlinePassed && navigate('/applications/' + encodeURIComponent(tender.id), { state: { fromTab: activeTab } })}
                  />

                  {activeTab === 'Ongoing' && (
                    <button
                      onClick={() => navigate('/applications/' + encodeURIComponent(tender.id), { state: { fromTab: activeTab } })}
                      className="mt-2 w-full py-2.5 text-xs font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Applications
                    </button>
                  )}

                  {activeTab === 'Completed' && (
                    <button
                      onClick={() => navigate('/applications/' + encodeURIComponent(tender.id), { state: { fromTab: activeTab } })}
                      className="mt-2 w-full py-2.5 text-xs font-semibold rounded-xl bg-tn-blue text-white border border-[#FFE5BF] transition-colors flex items-center justify-center gap-1.5"
                    >
                      View Details
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}