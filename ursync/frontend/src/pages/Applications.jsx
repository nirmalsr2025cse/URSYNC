// src/pages/Applications.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { useApi } from '../api/client'

const TABS = [
  { id: 'Open',      label: 'Open'      },
  { id: 'Upcoming',  label: 'Upcoming'  },
]

export default function Applications() {
  const navigate = useNavigate()
  const location = useLocation()
  const { apiFetch } = useApi()
  const PAGE_SIZE = 6

  const [currentPage, setCurrentPage] = useState(1)
  const [animating,   setAnimating]   = useState(false)
  const [search,      setSearch]      = useState('')
  const [dept,        setDept]        = useState('All')
  const [district,    setDistrict]    = useState('All')
  const [category,    setCategory]    = useState('All')
  const [activeTab, setActiveTab] = useState(location.state?.fromTab || 'Open')

  // ── Data from the backend ────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [tenders, setTenders] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [counts, setCounts] = useState({ Open: 0, Upcoming: 0 })

  const [departments, setDepartments] = useState(['All'])
  const [districts,   setDistricts]   = useState(['All'])
  const [categories,  setCategories]  = useState(['All'])

  // ── Load filter dropdown options once ────────────────────────────────
  useEffect(() => {
    apiFetch('/tenders/applications/meta')
      .then((res) => {
        setDepartments(['All', ...res.data.departments])
        setDistricts(['All', ...res.data.districts])
        setCategories(['All', ...res.data.categories])
      })
      .catch((err) => console.error('Failed to load filter meta:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildQueryParams = useCallback((extra = {}) => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (dept !== 'All') params.set('department', dept)
    if (district !== 'All') params.set('district', district)
    if (category !== 'All') params.set('category', category)
    Object.entries(extra).forEach(([k, v]) => params.set(k, v))
    return params.toString()
  }, [search, dept, district, category])

  // ── Fetch the active tab's tenders (paginated) ───────────────────────
  useEffect(() => {
    setLoading(true)
    const qs = buildQueryParams({ tab: activeTab, page: currentPage, limit: PAGE_SIZE })
    apiFetch(`/tenders/applications?${qs}`)
      .then((res) => {
        setTenders(res.data)
        setTotalPages(res.totalPages)
        setTotalCount(res.count)
      })
      .catch((err) => console.error('Failed to load tenders:', err))
      .finally(() => setLoading(false))
  }, [activeTab, currentPage, buildQueryParams, apiFetch])

  // ── Fetch tab badge counts whenever filters/search change ───────────
  useEffect(() => {
    const qs = buildQueryParams()
    apiFetch(`/tenders/applications/counts?${qs}`)
      .then((res) => setCounts(res.data))
      .catch((err) => console.error('Failed to load counts:', err))
  }, [buildQueryParams, apiFetch])

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setCurrentPage(1)
    setTimeout(() => { setActiveTab(id); setAnimating(false) }, 150)
  }

  function handleClear() {
    setSearch('')
    setDept('All')
    setDistrict('All')
    setCategory('All')
    setCurrentPage(1)
  }

  const hasFilters = Boolean(search.trim() || dept !== 'All' || district !== 'All' || category !== 'All')
  const selectClass = "px-3 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all cursor-pointer"

  const EMPTY_TEXT = {
    Open:      'No open application tenders.',
    Upcoming:  'No upcoming tenders yet.',
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in">

      {/* ── Header + Breadcrumb ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">Applications</h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Review government tenders by their application window status.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-tn-muted">
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
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by Tender ID or title..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
          </div>
          {search.trim() && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap self-center sm:self-auto px-2 py-2"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={dept} onChange={(e) => { setDept(e.target.value); setCurrentPage(1) }} className={selectClass + ' flex-1'}>
            {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
          <select value={district} onChange={(e) => { setDistrict(e.target.value); setCurrentPage(1) }} className={selectClass}>
            {districts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>)}
          </select>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setCurrentPage(1) }} className={selectClass}>
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          {hasFilters && !search.trim() && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-tn-muted hover:text-tn-danger underline ml-1 self-center"
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
          {totalCount} tender{totalCount !== 1 ? 's' : ''}
        </span>
        </div>
      </div>

      {/* ── Cards ──────────────────────────────────────────────────────── */}
      <div className={['transition-opacity duration-150', animating ? 'opacity-0' : 'opacity-100'].join(' ')}>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <TenderCardSkeleton key={i} />)}
          </div>
        ) : tenders.length === 0 ? (
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
            {tenders.map((tender) => (
              <div key={tender.id} className="flex flex-col">
                <TenderCard
                  tender={{ ...tender, status: activeTab }}
                  viewMode="grid"
                  className="flex-1"
                  onClick={() => navigate('/applications/' + encodeURIComponent(tender.id), { state: { fromTab: activeTab } })}
                  footer={
                    activeTab === 'Open' ? (
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
                    ) : null
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}