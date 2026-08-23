// src/pages/Approved.jsx
//
// Shows items already approved by the current user, split into the same
// Tenders / Bidders tab structure as Approvement.jsx. Cards here are
// VIEW-ONLY — no Approve/Reject/Edit/Delete, just a single "View" button
// styled with the same skin-tone (bg-[#FFF2DB]) used for View in
// Approvement.jsx's cards.
//
// Tab visibility (Tenders-only vs Tenders+Bidders) is now decided by the
// BACKEND (GET /api/approvement/tabs), not by a local ROLES_WITH_BIDDERS_TAB
// array. The backend inspects the authenticated user's role and returns
// exactly which tabs to render.
//
// Tenders tab cards: clicking the "View" button (not the card itself)
// navigates to the tender details page, passing the tender data via
// route state — mirrors the navigation pattern used in Home.jsx.
// Bidders tab cards keep their own separate (currently blank) view handler.

import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import {
  TENDER_APPROVAL_STATUS_CONFIG,
  PRIORITY_CONFIG,
  APPROVAL_TENDER_CATEGORIES,
} from '../constants/approvementConstants';

// ── API base ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function apiGet(path) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`)
  }
  return json
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, config }) {
  const sc = config[status] || Object.values(config)[0]
  return (
    <span className={['inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border', sc.bg, sc.text, sc.border].join(' ')}>
      <span className={['w-1.5 h-1.5 rounded-full flex-shrink-0', sc.dot].join(' ')} />
      {status}
    </span>
  )
}

// ── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Low']
  return (
    <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full', pc.bg, pc.text].join(' ')}>
      {priority}
    </span>
  )
}

// ── Meta Row ──────────────────────────────────────────────────────────────────
function MetaRow({ icon, label }) {
  const icons = {
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />,
    tag:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />,
    location: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    exp:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
  }
  return (
    <div className="flex items-start gap-1.5">
      <svg className="w-3 h-3 mt-px flex-shrink-0 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icons[icon]}
      </svg>
      <span className="leading-snug truncate">{label}</span>
    </div>
  )
}

// ── Approved Tender Card ────────────────────────────────────────────────────
// NOTE: no onClick on the outer card div — navigation only happens from the
// "View" button below, per the required behaviour.
function ApprovedTenderCard({ tender, onView }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full">
      <div className="h-48 overflow-hidden bg-[#FFF2DB]">
        <img src={tender.image} alt={tender.projectName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
      </div>
      <div className={['h-1 w-full', TENDER_APPROVAL_STATUS_CONFIG[tender.status]?.dot || 'bg-gray-400'].join(' ')} />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <StatusBadge status={tender.status} config={TENDER_APPROVAL_STATUS_CONFIG} />
          <PriorityBadge priority={tender.priority} />
        </div>
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase tracking-wide">{tender.id}</p>
        <h3 className="text-sm font-bold text-[#0A2240] leading-snug line-clamp-2">{tender.projectName}</h3>
        <p className="text-xs text-[#6B7A8D] line-clamp-2 leading-relaxed">{tender.description}</p>
        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="building" label={tender.department} />
          <MetaRow icon="tag" label={tender.category + ' · ' + tender.tenderType} />
          <MetaRow icon="location" label={tender.district} />
          <div className="flex items-center justify-between pt-1">
            <MetaRow icon="calendar" label={'Start: ' + formatDate(tender.startDate)} />
            <MetaRow icon="calendar" label={'End: ' + formatDate(tender.endDate)} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#FFE5BF]">
          <p className="text-sm font-extrabold text-[#0A2240]">₹ {tender.amount}</p>
          <p className="text-[10px] text-[#6B7A8D]">Updated {formatDate(tender.lastUpdated)}</p>
        </div>

        <div className="flex items-center gap-2 pt-1 mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onView(tender)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors"
          >
            <EyeIcon /> View
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Approved Bidder Card ─────────────────────────────────────────────────────
function ApprovedBidderCard({ bidder, onView }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full">
      <div className="h-48 overflow-hidden bg-[#FFF2DB]">
        <img src={bidder.image} alt={bidder.projectName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="h-1 w-full bg-[#1A4A8C]" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            Bidders Finalized
          </span>
        </div>
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase tracking-wide">{bidder.id}</p>
        <h3 className="text-sm font-bold text-[#0A2240] leading-snug line-clamp-2">{bidder.projectName}</h3>
        <p className="text-xs text-[#6B7A8D] line-clamp-2 leading-relaxed">{bidder.description}</p>
        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="building" label={bidder.department} />
          <MetaRow icon="tag" label={bidder.category} />
          <MetaRow icon="location" label={bidder.district} />
          <MetaRow icon="calendar" label={'Deadline: ' + formatDate(bidder.applicationDeadline)} />
          <MetaRow icon="exp" label={'Approved applicants: ' + (bidder.approvedApplicationCount ?? 0)} />
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#FFE5BF]">
          <p className="text-sm font-extrabold text-[#0A2240]">₹ {bidder.amount}</p>
          <p className="text-[10px] text-[#6B7A8D]">Updated {formatDate(bidder.lastUpdated)}</p>
        </div>

        <div className="flex items-center gap-2 pt-1 mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onView(bidder)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors"
          >
            <EyeIcon /> View
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-48 bg-[#FFF2DB]" />
      <div className="h-1 bg-[#FFE5BF]" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-24 bg-[#FFE5BF] rounded-full" />
          <div className="h-5 w-16 bg-[#FFE5BF] rounded-full" />
        </div>
        <div className="h-3 w-32 bg-[#FFE5BF] rounded" />
        <div className="h-4 w-full bg-[#FFE5BF] rounded" />
        <div className="h-4 w-3/4 bg-[#FFE5BF] rounded" />
        <div className="space-y-1.5 pt-2 border-t border-[#FFE5BF]">
          <div className="h-3 w-full bg-[#FFE5BF] rounded" />
          <div className="h-3 w-2/3 bg-[#FFE5BF] rounded" />
          <div className="h-3 w-3/4 bg-[#FFE5BF] rounded" />
        </div>
        <div className="h-7 w-full bg-[#FFE5BF] rounded-lg" />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Approved() {
  const itemsPerPage = useResponsiveItemsPerPage()
  const navigate = useNavigate()
  const location = useLocation()
  const rootPath = location.state?.fromPath || location.pathname

  // ── Tabs are now decided by the backend (GET /api/approvement/tabs),
  // based on the authenticated user's role — no local role list anymore.
  const [tabs, setTabs] = useState([{ id: 'tenders', label: 'Tenders' }])
  const [tabsLoading, setTabsLoading] = useState(true)
  const showBidders = tabs.some(t => t.id === 'bidders')

  const [activeTab,      setActiveTab]      = useState('tenders')
  const [animating,      setAnimating]      = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [search,         setSearch]         = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [currentPage,    setCurrentPage]    = useState(1)

  // Tenders approved by this user.
  const [approvedTenders, setApprovedTenders] = useState([])
  const [tendersLoading,  setTendersLoading]  = useState(true)
  const [tendersError,    setTendersError]    = useState(null)

  // Bidders finalized (only fetched if the backend granted the tab).
  const [approvedBidders, setApprovedBidders] = useState([])
  const [biddersLoading,  setBiddersLoading]  = useState(true)
  const [biddersError,    setBiddersError]    = useState(null)

  // ── Fetch which tabs to render, from the backend ───────────────────────
  function fetchTabs() {
    setTabsLoading(true)
    apiGet('/approvement/tabs')
      .then((res) => {
        setTabs(res.data && res.data.length ? res.data : [{ id: 'tenders', label: 'Tenders' }])
      })
      .catch(() => {
        // Fall back to Tenders-only if the tabs endpoint fails.
        setTabs([{ id: 'tenders', label: 'Tenders' }])
      })
      .finally(() => setTabsLoading(false))
  }

  // ── Fetch tenders approved by this user ───────────────────────────────
  function fetchApprovedTenders() {
    setTendersLoading(true)
    setTendersError(null)
    apiGet('/approvement/tenders/approved')
      .then((res) => {
        setApprovedTenders(res.data || [])
      })
      .catch((err) => {
        setTendersError(err.message || 'Failed to load approved tenders.')
      })
      .finally(() => {
        setTendersLoading(false)
      })
  }

  // ── Fetch bidders (tenders) finalized ─────────────────────────────────
  function fetchApprovedBidders() {
    setBiddersLoading(true)
    setBiddersError(null)
    apiGet('/approvement/bidders/approved')
      .then((res) => {
        setApprovedBidders(res.data || [])
      })
      .catch((err) => {
        setBiddersError(err.message || 'Failed to load approved bidders.')
      })
      .finally(() => {
        setBiddersLoading(false)
      })
  }

  useEffect(() => {
    fetchTabs()
    fetchApprovedTenders()
  }, [])

  // Once the backend confirms the Bidders tab is available, load its data.
  useEffect(() => {
    if (showBidders) fetchApprovedBidders()
  }, [showBidders])

  // If the backend doesn't grant the Bidders tab, always keep the view on
  // Tenders (covers the tabs response arriving after activeTab was already
  // switched, or changing between page loads).
  useEffect(() => {
    if (!showBidders && activeTab !== 'tenders') {
      setActiveTab('tenders')
    }
  }, [showBidders, activeTab])

  const categoryOptions = activeTab === 'tenders'
    ? ['All', ...APPROVAL_TENDER_CATEGORIES]
    : ['All', ...new Set(approvedBidders.map(b => b.category).filter(Boolean))]

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setLoading(true)
    setSearch(''); setCategoryFilter('All'); setCurrentPage(1)
    setTimeout(() => {
      setActiveTab(id)
      setAnimating(false)
      setLoading(false)
    }, 200)
  }

  function handleClear() {
    setSearch(''); setCategoryFilter('All'); setCurrentPage(1)
  }

  const filtered = useMemo(() => {
    const data = activeTab === 'tenders' ? approvedTenders : approvedBidders

    return data.filter((item) => {
      const q = search.trim().toLowerCase()

      const matchesSearch = !q || (
        (item.id || '').toLowerCase().includes(q) ||
        (item.projectName || '').toLowerCase().includes(q) ||
        (item.department || '').toLowerCase().includes(q) ||
        (item.district || '').toLowerCase().includes(q)
      )

      const matchesCategory =
        categoryFilter === 'All' || item.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [activeTab, approvedTenders, approvedBidders, search, categoryFilter])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  useEffect(() => { setCurrentPage(1) }, [search, categoryFilter, activeTab])

  // ── Tenders tab "View" button — navigates to the tender details page,
  // passing the full tender object via route state (mirrors Home.jsx).
  // Only wired to ApprovedTenderCard's View button, never the card itself.
  function handleViewTender(tender) {
    navigate('/tender-details-view/' + encodeURIComponent(tender.id), {
      state: { tender, fromPath: rootPath },
    })
  }

  // ── Bidders tab "View" button — navigates to the read-only applicant
  // list for this tender (ApplicationApplicants.jsx), sourced from
  // bidderlists (tender_authority) or finalbidders (department_head /
  // department_employee) on the backend. `bidder.id` is the tenderCode
  // (e.g. "TN/PWD/2026/001") — matches the encoding the normal
  // pending-applicants flow already uses, so the URL shape is consistent
  // across both flows. The backend resolves tenderCode -> Tender._id
  // itself before querying bidderlists/finalbidders.
  function handleViewBidder(bidder) {
    navigate('/applications/' + encodeURIComponent(bidder.id), {
      state: { readOnly: true, fromPath: rootPath },
    })
  }

  const hasFilters = search || categoryFilter !== 'All'

  const tenderCount = approvedTenders.length
  const bidderCount = approvedBidders.length

  return (
    <div className="p-4 lg:p-6 space-y-5 relative animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Approved</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            Tenders and bidder finalizations you've approved.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7A8D]">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#1A4A8C] font-semibold">Approved</span>
        </nav>
      </div>

      {/* ── Tab Bar (rendered from backend-provided `tabs`) ────────────── */}
      {!tabsLoading && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const count = tab.id === 'tenders' ? tenderCount : bidderCount
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={[
                    'flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-[#0A2240] text-white shadow-sm'
                      : 'text-[#1A4A8C] border border-[#FFE5BF] bg-transparent hover:bg-[#FFF2DB]',
                  ].join(' ')}
                >
                  {tab.label}
                  <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]'].join(' ')}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <span className="text-xs font-medium text-[#6B7A8D] bg-white border border-[#FFE5BF] px-3 py-1.5 rounded-full whitespace-nowrap">
            {filtered.length} {activeTab === 'tenders' ? 'tender' : 'bidder'}{filtered.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}

      {/* ── Search & Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Tender ID, Project Name, Department or District..."
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
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all cursor-pointer"
        >
          {categoryOptions.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
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

      {/* ── Tenders error state ────────────────────────────────────────── */}
      {activeTab === 'tenders' && tendersError && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 border-dashed">
          <p className="font-bold text-red-600 mb-1">Couldn't load approved tenders.</p>
          <p className="text-sm text-[#6B7A8D] mb-4">{tendersError}</p>
          <button
            onClick={fetchApprovedTenders}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Bidders error state ────────────────────────────────────────── */}
      {activeTab === 'bidders' && biddersError && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 border-dashed">
          <p className="font-bold text-red-600 mb-1">Couldn't load approved bidders.</p>
          <p className="text-sm text-[#6B7A8D] mb-4">{biddersError}</p>
          <button
            onClick={fetchApprovedBidders}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Cards Grid ──────────────────────────────────────────────────── */}
      {!((activeTab === 'tenders' && tendersError) || (activeTab === 'bidders' && biddersError)) && (
      <div className={['transition-opacity duration-150', animating ? 'opacity-0' : 'opacity-100'].join(' ')}>
        {loading || (activeTab === 'tenders' ? tendersLoading : biddersLoading) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
            <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
              <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-bold text-[#0A2240] mb-1">
              No {activeTab === 'tenders' ? 'approved tenders' : 'approved bidders'} found
            </p>
            <p className="text-sm text-[#6B7A8D]">Try adjusting your search or filters.</p>
            {hasFilters && (
              <button onClick={handleClear} className="mt-4 text-xs font-semibold text-[#1A4A8C] hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {activeTab === 'tenders'
              ? paginated.map(tender => (
                  <ApprovedTenderCard
                    key={tender.recordId}
                    tender={tender}
                    onView={handleViewTender}
                  />
                ))
              : paginated.map(bidder => (
                  <ApprovedBidderCard
                    key={bidder.recordId}
                    bidder={bidder}
                    onView={handleViewBidder}
                  />
                ))
            }
          </div>
        )}
      </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {!loading && !(activeTab === 'tenders' ? tendersLoading : biddersLoading) && filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

// ── Icon Components ───────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}