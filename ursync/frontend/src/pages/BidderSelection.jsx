// src/pages/BidderSelection.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TenderCard from '../components/TenderCard'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { APPLICATION_TENDERS } from '../data/applicationMockData'
import { useRole, ROLES } from '../components/RoleContext'

function isDeadlinePassed(d) { return new Date(d) < new Date() }

const TABS = [
  { id: 'Ongoing',   label: 'Ongoing'   },
  { id: 'Upcoming',  label: 'Upcoming'  },
  { id: 'Completed', label: 'Completed' },
]

export default function BidderSelection() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role }  = useRole()
  const PAGE_SIZE = useResponsiveItemsPerPage()
  const rootPath = location.state?.fromPath || location.pathname

  // Dept roles hide dropdowns
  const isDeptRole = role === ROLES.DEPARTMENT_EMPLOYEE || role === ROLES.DEPARTMENT_HEAD

  const [activeTab,   setActiveTab]   = useState(location.state?.fromTab || 'Ongoing')
  const [currentPage, setCurrentPage] = useState(1)
  const [animating,   setAnimating]   = useState(false)
  const [search,      setSearch]      = useState('')
  const [dept,        setDept]        = useState('All')
  const [district,    setDistrict]    = useState('All')
  const [category,    setCategory]    = useState('All')
  const [activeMarker, setActiveMarker] = useState(null)

  const DEPARTMENTS = ['All', ...new Set(APPLICATION_TENDERS.map(t => t.department))]
  const DISTRICTS   = ['All', ...new Set(APPLICATION_TENDERS.map(t => t.district))]
  const CATEGORIES  = ['All', ...new Set(APPLICATION_TENDERS.map(t => t.category))]

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setCurrentPage(1)
    setActiveMarker(null)
    setTimeout(() => { setActiveTab(id); setAnimating(false) }, 150)
  }

  function handleClear() {
    setSearch(''); setDept('All'); setDistrict('All'); setCategory('All'); setCurrentPage(1); setActiveMarker(null)
  }

  // ── Tab filtering — only show tenders sent by Tender Authority ─────────────
  const tabFiltered = useMemo(() => {
    return APPLICATION_TENDERS.filter((t) => {
      const passed = isDeadlinePassed(t.applicationDeadline)
      if (activeTab === 'Ongoing')   return passed && !t.sentToDept
      if (activeTab === 'Upcoming')  return !passed
      if (activeTab === 'Completed') return t.sentToDept
      return true
    })
  }, [activeTab])

  const filtered = useMemo(() => {
    let list = tabFiltered
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q))
    }
    if (!isDeptRole) {
      if (dept     !== 'All') list = list.filter(t => t.department === dept)
      if (district !== 'All') list = list.filter(t => t.district   === district)
      if (category !== 'All') list = list.filter(t => t.category   === category)
    }
    return list
  }, [tabFiltered, search, dept, district, category, isDeptRole])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage, PAGE_SIZE])

  const counts = {
    Ongoing:   APPLICATION_TENDERS.filter(t => isDeadlinePassed(t.applicationDeadline) && !t.sentToDept).length,
    Upcoming:  APPLICATION_TENDERS.filter(t => !isDeadlinePassed(t.applicationDeadline)).length,
    Completed: APPLICATION_TENDERS.filter(t => t.sentToDept).length,
  }

  const hasFilters = search || dept !== 'All' || district !== 'All' || category !== 'All'
  const selectClass = "px-3 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all cursor-pointer"

  const EMPTY_TEXT = {
    Ongoing:   'No tenders available for bidder selection.',
    Upcoming:  'No upcoming tenders.',
    Completed: 'No completed tenders.',
  }

  function handleCardClick(tender, idx) {
    setActiveMarker(idx)
    if (!isDeadlinePassed(tender.applicationDeadline)) return
    // Give the highlight a moment to actually paint before navigating away —
    // otherwise the state change and the route change land in the same tick
    // and the highlighted style never gets a chance to render.
    setTimeout(() => {
      navigate('/bidder-selection/' + encodeURIComponent(tender.id), {
        state: { fromTab: activeTab, fromPath: rootPath },
      })
    }, 150)
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in">

      {/* ── Header + Breadcrumb ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Bidder Selection</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            Review and select bidders from applications sent by Tender Authority.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7A8D]">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#1A4A8C] font-semibold">Bidder Selection</span>
        </nav>
      </div>

      {/* ── Search & Filters ────────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm space-y-3">
        {/* Search always shown */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              placeholder="Search by Tender ID or title..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
          </div>
        </div>

        {/* Dropdowns — hidden for dept roles */}
        {!isDeptRole && (
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
              <button onClick={handleClear}
                      className="px-4 py-2.5 text-sm font-semibold text-[#F62440] border border-red-200 rounded-xl hover:bg-red-50 transition-colors whitespace-nowrap">
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={[
                  'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-[#0A2240] text-white shadow-sm'
                    : 'text-[#1A4A8C] border border-[#FFE5BF] bg-transparent hover:bg-[#FFF2DB]',
                ].join(' ')}
              >
                {tab.label}
                <span className={[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]',
                ].join(' ')}>
                  {counts[tab.id]}
                </span>
              </button>
            )
          })}
        </div>
        <span className="text-xs font-medium text-[#6B7A8D] bg-white border border-[#FFE5BF] px-3 py-1.5 rounded-full">
          {filtered.length} tender{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Cards ───────────────────────────────────────────────────────── */}
      <div className={['transition-opacity duration-150', animating ? 'opacity-0' : 'opacity-100'].join(' ')}>
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
            <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
              <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-bold text-[#0A2240] mb-1">{EMPTY_TEXT[activeTab]}</p>
            <p className="text-sm text-[#6B7A8D]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {paginated.map((tender, idx) => {
              const deadlinePassed = isDeadlinePassed(tender.applicationDeadline)
              return (
                <div key={tender.id} className="flex flex-col">

                  {/* Badges above card */}
                  {activeTab === 'Upcoming' && (
                    <span className="self-start mb-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Applications Still Open
                    </span>
                  )}
                  {activeTab === 'Completed' && tender.approvedCount && (
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tender.approvedCount} Approved
                      </span>
                      {tender.sentDate && (
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                          Sent: {new Date(tender.sentDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                        </span>
                      )}
                    </div>
                  )}

                  <TenderCard
                    tender={{ ...tender, status: activeTab }}
                    viewMode="grid"
                    highlighted={activeMarker === idx}
                    className="flex-1"
                    onClick={() => handleCardClick(tender, idx)}
                  />

                  {/* Select Bidders button — only for Ongoing */}
                  {activeTab === 'Ongoing' && (
                    <button
                      onClick={() => handleCardClick(tender, idx)}
                      className="mt-2 w-full py-2.5 text-xs font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Select Bidders
                    </button>
                  )}

                  {activeTab === 'Completed' && (
                    <button
                      onClick={() => handleCardClick(tender, idx)}
                      className="mt-2 w-full py-2.5 text-xs font-semibold rounded-xl bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors"
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