// src/pages/CancelledRetendered.jsx
import React, { useState, useMemo } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import { CANCELLED_TENDERS, RETENDERED_TENDERS } from '../data/MockDataCR'
import { useRole } from '../components/RoleContext'
import { useNavigate , useLocation } from 'react-router-dom'

const TABS = [
  { id: 'cancelled',  label: 'Cancelled'  },
  { id: 'retendered', label: 'Retendered' },
]

export default function CancelledRetendered() {
  const [activeTab,     setActiveTab]     = useState('cancelled')
  const [searchInput,   setSearchInput]   = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [animating,     setAnimating]     = useState(false)
  const { role } = useRole()
  const [activeMarker, setActiveMarker] = useState(null)
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const rootPath = location.state?.fromPath || location.pathname

  
  // Department mapping — same as rest of project
  const ROLE_DEPT_MAP = {
    department_employee: 'Public Works Department',
    department_head:     'Public Works Department',
  }

  const isDeptRole       = role === 'department_employee' || role === 'department_head'
  const isTenderPerson   = role === 'tender_person'
  const userDept         = ROLE_DEPT_MAP[role] || null

  // Tender Person email — replace with real auth when backend ready
  const TENDER_PERSON_EMAIL = 'srnirmal1809@gmail.com'

  const rawData = useMemo(() => {
    const all = activeTab === 'cancelled' ? CANCELLED_TENDERS : RETENDERED_TENDERS

    // Department Employee / Head — show only their dept
    if (isDeptRole && userDept) {
      return all.filter((t) => t.department === userDept)
    }

    // Tender Person — show only cancelled tenders where cancelledBy matches their email
    if (isTenderPerson) {
      return CANCELLED_TENDERS.filter(
        (t) => t.cancelledBy === TENDER_PERSON_EMAIL
      )
    }

    // All other roles — show everything
    return all
  }, [activeTab, role])
  
  // ── Normalise data to match TenderCard field names ────────────────────────
  // TenderCard expects: id, title, description, organization, department,
  // location, closingDate, status, category, value, image, documentUrl
  const normalised = useMemo(() => {
    return rawData.map((t) => ({
      ...t,
      // TenderCard uses closingDate for the date row
      closingDate: activeTab === 'cancelled' ? t.cancelledOn : t.retenderedOn,
      // Force status so TenderCard picks the right bar/badge colour
      status: activeTab === 'cancelled' ? 'Closed' : 'Upcoming',
    }))
  }, [rawData, activeTab])

  // ── Filter ────────────────────────────────────────────────────────────────
  // NOTE: only returns results once a search has actually been applied
  // (i.e. the user typed something and pressed Enter / clicked Search).
  // Before that, this stays empty so the "prompt to search" state shows.
  const filtered = useMemo(() => {
    if (!appliedSearch.trim()) return []
    const q = appliedSearch.toLowerCase()
    return normalised.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.organization.toLowerCase().includes(q)
    )
  }, [normalised, appliedSearch])

  const hasSearched = appliedSearch.trim().length > 0

  function handleSearch() {
    if (!searchInput.trim()) return
    setSearching(true)
    setTimeout(() => {
      setAppliedSearch(searchInput)
      setSearching(false)
    }, 600)
  }

  function handleClear() {
    setSearchInput('')
    setAppliedSearch('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch()
  }

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setSearchInput('')
    setAppliedSearch('')
    setActiveMarker(null)  // ← add this line
    setTimeout(() => {
      setActiveTab(id)
      setAnimating(false)
    }, 150)
  }

   const visibleTabs = isTenderPerson? TABS.filter((t) => t.id === 'cancelled'): TABS

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">

      {/* ── Page Header + Breadcrumb ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-tn-navy">
            Cancelled / Retendered Tenders
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Browse cancelled and retendered tenders across Tamil Nadu.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-tn-muted">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Cancelled / Retendered</span>
        </nav>
      </div>
      {isDeptRole && userDept && (
        <div className="flex items-center gap-3 bg-tn-light border border-tn-border rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-tn-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg> 
          <p className="text-xs text-tn-navy font-medium">
            Showing tenders for{' '}
            <span className="font-bold">{userDept}</span> only.
          </p>
        </div>
      )}

        {/* Tab Bar — pill style matching reference image */}
          <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 gap-1">
            {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
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

      {/* ── Search + Tab card ──────────────────────────────────────────── */}
      <div className="bg-white border border-tn-border rounded-2xl p-5 shadow-sm space-y-5">

        {/* Search */}
        <div>
          <p className="text-[15px] font-bold text-tn-navy uppercase tracking-widest mb-2">
            Tender ID
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. TN-2026-0123"
              className="w-full pl-3 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
            <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              disabled={!searchInput.trim() || searching}
              className={[
                'btn-primary flex items-center justify-center gap-2 min-w-[120px]',
                'disabled:opacity-40 disabled:blur-[0.5px] disabled:cursor-not-allowed disabled:pointer-events-none',
              ].join(' ')}
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
              {searchInput && (
                <button
                  onClick={handleClear}
                  className="text-xs text-tn-muted underline whitespace-nowrap"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section Label ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={[
            'w-2 h-6 rounded-full',
            activeTab === 'cancelled' ? 'bg-tn-danger' : 'bg-tn-blue',
          ].join(' ')} />
          <div>
            <h2 className="font-bold text-tn-navy text-base">
              {activeTab === 'cancelled' ? 'Cancelled Tenders' : 'Retendered Tenders'}
            </h2>
            {hasSearched && (
              <p className="text-xs text-tn-muted">
                {filtered.length} tender{filtered.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Cards Grid / Empty States ─────────────────────────────────── */}
      <div className={[
        'transition-opacity duration-150',
        animating ? 'opacity-0' : 'opacity-100',
      ].join(' ')}>

        {!hasSearched ? (
          // ── Prompt-to-search state (matches reference image) ──────────
          <div className="flex flex-col items-center justify-center py-20
                          bg-white rounded-2xl border border-tn-border border-dashed">
            <div className="w-14 h-14 rounded-full bg-tn-light flex items-center
                            justify-center mb-4 border border-tn-border">
              <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="font-bold text-tn-navy mb-1">
              Search for {activeTab === 'cancelled' ? 'cancelled' : 'retendered'} tenders
            </p>
            <p className="text-sm text-tn-muted text-center px-4">
              Enter a Tender ID or organisation name above to
              <br />
              find {activeTab === 'cancelled' ? 'cancelled' : 'retendered'} tenders.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          // ── No matches for the search that was applied ─────────────────
          <div className="flex flex-col items-center justify-center py-20
                          bg-white rounded-2xl border border-tn-border border-dashed">
            <div className="w-14 h-14 rounded-full bg-tn-light flex items-center
                            justify-center mb-4 border border-tn-border">
              <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-bold text-tn-navy mb-1">
              No {activeTab} tenders found
            </p>
            <p className="text-sm text-tn-muted">
              {isTenderPerson
                ? 'No cancelled tenders found for your account.'
                : 'Try a different search term.'
              }
            </p>
          </div>
        ) : (
          // ── Matching results ─────────────────────────────────────────
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {filtered.map((tender, idx) => (
              <div key={tender.id} className="flex">
                <TenderCard
                  tender={tender}
                  viewMode="grid"
                  className="flex-1"
                  highlighted={activeMarker === idx}
                  onClick={() => setActiveMarker(idx)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}