// src/pages/Home.jsx
import React, { useState, useEffect } from 'react'
import TenderCard from '../components/TenderCard'
import { useApi } from '../api/client'
import { useRole, ROLES, ROLE_LABELS } from '../components/RoleContext'
import Pagination from '../components/Pagination'
import { useNavigate , useLocation } from 'react-router-dom'


// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  {
    id:       'ongoing',
    label:    'Ongoing',
    activeBg: 'bg-emerald-600',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',  // lightning / activity
    dotColor: 'bg-emerald-500',
    ringColor:'ring-emerald-200',
  },
  {
    id:       'upcoming',
    label:    'Upcoming',
    activeBg: 'bg-amber-500',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', // clock
    dotColor: 'bg-amber-500',
    ringColor:'ring-amber-200',
  },
  {
    id:       'completed',
    label:    'Completed',
    activeBg: 'bg-[#1A4A8C]',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', // check circle
    dotColor: 'bg-blue-500',
    ringColor:'ring-blue-200',
  },
]

// Roles that should see only their department's tenders (frontend demo)
// When backend is connected, remove this filtering entirely from frontend
const DEPARTMENT_RESTRICTED_ROLES = [
  ROLES.DEPARTMENT_EMPLOYEE,
  ROLES.DEPARTMENT_HEAD,
  ROLES.FINANCIAL,
  ROLES.TENDER_AUTHORITY,
]

export default function Home() {
  const { role } = useRole()
  const {apiFetch} = useApi()
  const [activeTab,  setActiveTab]  = useState('ongoing')
  const [viewMode,   setViewMode]   = useState('grid')
  const [searchQuery, setSearch]    = useState('')
  const [filterCat,  setFilterCat]  = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeMarker, setActiveMarker] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const currentTab = TABS.find((t) => t.id === activeTab)

  const rootPath = location.state?.fromPath || location.pathname

  const [tendersData, setTendersData] = useState({ tenders: [], totalPages: 1, totalCount: 0 })
  const [stats, setStats] = useState({ ongoing: 0, upcoming: 0, completed: 0, total: 0 })
  const [allCategories, setAllCategories] = useState(['All'])
  const [loading, setLoading] = useState(true)

  // Reset to page 1 whenever tab/search/filter changes
  React.useEffect(() => { 
    setCurrentPage(1)
    setActiveMarker(null)
  }, [activeTab, searchQuery, filterCat])

  // ── All categories across all tabs ───────────────────────────────────────
   // Fetch tenders whenever tab/search/filter/page/role changes
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      status: activeTab,
      search: searchQuery,
      category: filterCat,
      page: currentPage,
      limit: 6,
    })
    apiFetch(`/tenders?${params}`)
      .then(setTendersData)
      .catch((err) => console.error('Failed to fetch tenders:', err))
      .finally(() => setLoading(false))
  }, [activeTab, searchQuery, filterCat, currentPage, role])

  // Fetch stats whenever role changes
  useEffect(() => {
    apiFetch('/tenders/stats')
      .then(setStats)
      .catch((err) => console.error('Failed to fetch stats:', err))
  }, [role])

  // Fetch category list once (and when role changes, since it's department-scoped too)
  useEffect(() => {
    apiFetch('/tenders/categories')
      .then((d) => setAllCategories(d.categories))
      .catch((err) => console.error('Failed to fetch categories:', err))
  }, [role])

  const currentTenders = tendersData.tenders
  const totalPages = tendersData.totalPages
  const paginated = tendersData.tenders // already paginated server-side, no .slice() needed

  const isDeptRole = DEPARTMENT_RESTRICTED_ROLES.includes(role)
  const deptName = isDeptRole ? currentTenders[0]?.department || null : null
  const total = stats.total

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative bg-[#0A2240] rounded-2xl overflow-hidden px-6 py-7 lg:px-10 lg:py-10">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -right-4 w-72 h-72 bg-[#F62440]/10 rounded-full pointer-events-none" />
        <div className="absolute top-4 right-32 w-16 h-16 bg-[#FFE5BF]/10 rounded-full hidden lg:block pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20
                          text-white/80 text-xs px-3 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-[#F62440] rounded-full" />
            {isDeptRole && deptName
              ? `${ROLE_LABELS[role]} — ${deptName}`
              : 'Official Government Portal'
            }
          </div>

          <h2 className="text-white text-2xl lg:text-3xl font-extrabold leading-tight mb-2">
            Tamil Nadu e-Tender
            <br />
            <span className="text-[#FFE5BF]">Management System</span>
          </h2>
          <p className="text-white/60 text-sm mb-6 max-w-md">
            {isDeptRole
              ? `Showing tenders assigned to your department only.`
              : 'Transparent, efficient, and accountable procurement for the people of Tamil Nadu.'
            }
          </p>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Total Tenders', value: total,          color: 'text-white' },
              { label: 'Ongoing',       value: stats.ongoing,  color: 'text-emerald-400' },
              { label: 'Upcoming',      value: stats.upcoming, color: 'text-amber-400' },
              { label: 'Completed',     value: stats.completed,color: 'text-blue-300' },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10"
              >
                <p className={`font-bold text-lg leading-none ${s.color}`}>{s.value}</p>
                <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Department notice (only for restricted roles) ────────────────── */}
      {isDeptRole && deptName && (
        <div className="flex items-center gap-3 bg-[#FFF2DB] border border-[#FFE5BF]
                        rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none"
               stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-800 font-medium">
            Showing tenders for <span className="font-bold">{deptName}</span> only.
            {' '}
            <span className="text-amber-600">
              Backend will automatically filter by your department when connected.
            </span>
          </p>
        </div>
      )}

      {/* ── Search + Filter ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
          />
          {/* Bridge Button ❌ Button */}
          {searchQuery && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category filter */}
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white
                     text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30
                     focus:border-[#1A4A8C] transition-all cursor-pointer"
        >
          {allCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex bg-white border border-[#FFE5BF] rounded-xl p-1 shadow-sm self-start">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-tn-navy text-white' : 'text-gray-400 hover:text-tn-navy'
            }`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-tn-navy text-white' : 'text-gray-400 hover:text-tn-navy'
            }`}
            aria-label="List view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
      <div className="flex min-w-max bg-white border border-[#FFE5BF] rounded-2xl p-1 shadow-sm">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const count = stats[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1 sm:gap-2 md:gap-1 px-2 sm:px-4 md:px-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap',
                'transition-all duration-200 flex-1 justify-center',
                isActive
                  ? `${tab.activeBg} text-white shadow-md`
                  : 'text-gray-500 hover:text-[#0A2240] hover:bg-[#FFFAF3]',
              ].join(' ')}
            >
              {/* Icon */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.iconPath} />
              </svg>
              <span>{tab.label}</span>
              <span className={[
                'text-xs px-1.5 py-0.5 rounded-full font-bold',
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
              ].join(' ')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
      </div>

      {/* ── Section label ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-6 rounded-full ${currentTab.dotColor}`} />
          <div>
            <h3 className="font-bold text-[#0A2240] text-base">
              {currentTab.label} Tenders
            </h3>
            <p className="text-xs text-gray-400">
              {currentTenders.length} tender{currentTenders.length !== 1 ? 's' : ''}
              {searchQuery || filterCat !== 'All' ? ' matching filters' : ' found'}
            </p>
          </div>
        </div>

        {/* Clear filters */}
        {(searchQuery || filterCat !== 'All') && (
          <button
            onClick={() => { setSearch(''); setFilterCat('All') }}
            className="text-xs text-[#F62440] hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Cards ───────────────────────────────────────────────────────── */}
      {currentTenders.length > 0 ? (
        <React.Fragment>
        <div key={currentPage} className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 animate-fade-in'
            : 'flex flex-col gap-3 animate-fade-in'
        }>
          {paginated.map((tender, idx) => (
            <TenderCard
              key={tender.id}
              tender={tender}
              viewMode={viewMode}
              highlighted={activeMarker === idx}
              onClick={() => {
                setActiveMarker(idx)
                navigate('/tender-details-view/' + encodeURIComponent(tender.id), {
                  state: { tender, fromPath: rootPath }
                })
              }}
            />
          ))}
                    
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </React.Fragment>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center
                        bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center
                          justify-center mb-4 border border-[#FFE5BF]">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-bold text-[#0A2240] mb-1">No tenders found</p>
          <p className="text-sm text-gray-400 max-w-xs">
            {searchQuery || filterCat !== 'All'
              ? 'Try adjusting your search or filter.'
              : `No ${activeTab} tenders for your department right now.`
            }
          </p>
          {(searchQuery || filterCat !== 'All') && (
            <button
              onClick={() => { setSearch(''); setFilterCat('All') }}
              className="mt-4 text-xs font-semibold text-[#1A4A8C] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}