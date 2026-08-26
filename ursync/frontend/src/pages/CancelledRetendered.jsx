// src/pages/CancelledRetendered.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import Pagination from '../components/Pagination'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApi } from '../api/client'

const TABS = [
  { id: 'cancelled',  label: 'Cancelled'  },
  { id: 'retendered', label: 'Retendered' },
]

const ITEMS_PER_PAGE = 6
const SEARCH_DEBOUNCE_MS = 350

export default function CancelledRetendered() {
  const { apiFetch } = useApi()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeTab,   setActiveTab]   = useState('cancelled')
  const [keyword,     setKeyword]     = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [animating,   setAnimating]   = useState(false)
  const [activeMarker, setActiveMarker] = useState(null)

  const [results,    setResults]    = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  // No role filtering here — the backend (authMiddleware + controller)
  // already scopes results to the caller's department when applicable.
  // Both tabs are always shown; the "retendered" tab simply returns an
  // empty/normal result set per whatever the backend allows for this user.
  const visibleTabs = TABS

  const rootPath = location.state?.fromPath || location.pathname

  const debounceRef  = useRef(null)
  const requestIdRef = useRef(0)
  const isFirstRun   = useRef(true)

  // ── Fetch from backend ───────────────────────────────────────────────
  const fetchTenders = useCallback(async (tab, kw, page) => {
    const myRequestId = ++requestIdRef.current
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('tab', tab)
      if (kw.trim()) params.set('search', kw.trim())
      params.set('page', String(page))
      params.set('limit', String(ITEMS_PER_PAGE))

      const data = await apiFetch(`/tenders/by-canclledRetenders?${params.toString()}`)
      if (myRequestId !== requestIdRef.current) return

      setResults(data.tenders || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 1)
      setActiveMarker(null)
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return
      console.error('Cancelled/Retendered fetch failed:', err)
      setError(err.message || 'Failed to load tenders. Please try again.')
      setResults([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false)
    }
  }, [apiFetch])

  // ── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchTenders(activeTab, '', 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-search: debounced, fires on keyword change ──────────────────
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchTenders(activeTab, keyword, 1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  function switchTab(id) {
    if (id === activeTab) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setAnimating(true)
    setKeyword('')
    setCurrentPage(1)
    setActiveMarker(null)
    setTimeout(() => {
      setActiveTab(id)
      setAnimating(false)
      fetchTenders(id, '', 1)
    }, 150)
  }

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setKeyword('')
    setCurrentPage(1)
    fetchTenders(activeTab, '', 1)
  }

  function handlePageChange(page) {
    setCurrentPage(page)
    fetchTenders(activeTab, keyword, page)
  }

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

      {/* Tab Bar */}
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

      {/* ── Search Card ────────────────────────────────────────────────── */}
      <div className="bg-white border border-tn-border rounded-2xl p-5 shadow-sm space-y-3">
        <p className="text-[15px] font-bold text-tn-navy uppercase tracking-widest">
          Tender ID / Organisation
        </p>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. TN-2026-0123"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
            {loading && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <div className="w-4 h-4 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {keyword && (
            <button
              onClick={handleClear}
              className="text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap flex-shrink-0"
            >
              Clear all
            </button>
          )}
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
            {!loading && (
              <p className="text-xs text-tn-muted">
                {totalCount} tender{totalCount !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-tn-danger" role="alert">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Cards Grid / Skeleton / Empty States ─────────────────────── */}
      <div className={[
        'transition-opacity duration-150',
        animating ? 'opacity-0' : 'opacity-100',
      ].join(' ')}>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
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
              {keyword
                ? 'Try a different search term.'
                : `There are currently no ${activeTab} tenders.`
              }
            </p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {results.map((tender, idx) => (
              <div key={tender.id} className="flex">
                <TenderCard
                  tender={tender}
                  viewMode="grid"
                  className="flex-1"
                  highlighted={activeMarker === idx}
                  onClick={() => {
                    setActiveMarker(idx)
                    navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender, fromPath: rootPath } })
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && !error && results.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}