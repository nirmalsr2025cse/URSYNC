// src/pages/TendersByDepartment.jsx
import React, { useState, useMemo } from 'react'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import { tenders } from '../data/tenders'

// ── Flatten all tenders ───────────────────────────────────────────────────────
const ALL_TENDERS = [
  ...tenders.ongoing,
  ...tenders.upcoming,
  ...tenders.completed,
]

// ── Unique departments (no duplicates) ────────────────────────────────────────
const DEPARTMENTS = [
  'All Departments',
  ...Array.from(new Set(ALL_TENDERS.map((t) => t.department).filter(Boolean))),
]

export default function TenderByDepartment() {
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [searched,     setSearched]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [results,      setResults]      = useState([])
  const [activeTab, setActiveTab] = useState('all')

  async function handleSearch() {
    setLoading(true)
    setSearched(true)
    await new Promise((r) => setTimeout(r, 600))
    const filtered = selectedDept === 'All Departments'
      ? ALL_TENDERS
      : ALL_TENDERS.filter((t) => t.department === selectedDept)
    setResults(filtered)
    setActiveTab('all')
    setLoading(false)
  }

  function handleDeptChange(e) {
    setSelectedDept(e.target.value)
    setSearched(false)
    setResults([])
  }

  function handleClear() {
    setSelectedDept('All Departments')
    setSearched(false)
    setResults([])
  }

  const tabResults = useMemo(() => {
    if (activeTab === 'all')       return results
    if (activeTab === 'ongoing')   return results.filter((t) => t.status === 'Ongoing')
    if (activeTab === 'upcoming')  return results.filter((t) => t.status === 'Upcoming')
    if (activeTab === 'completed') return results.filter((t) => t.status === 'Completed')
    return results
    }, [results, activeTab])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Page Header + Breadcrumb ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Tenders by Department
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Browse tenders by selecting a government department.
          </p>
        </div>
        <nav className="text-xs text-tn-muted flex items-center gap-1.5" aria-label="Breadcrumb">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Tenders by Department</span>
        </nav>
      </div>

      {/* ── Search Section ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
        <p className="text-[10px] font-bold text-tn-muted uppercase tracking-widest mb-2">
          Department
        </p>
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Dropdown */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <select
              value={selectedDept}
              onChange={handleDeptChange}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
              aria-label="Select department"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 min-w-[120px]"
          >
            {loading ? (
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

          {/* Clear */}
          {searched && (
            <button
                type="button"
                onClick={handleClear}
                className="text-xs text-tn-muted hover:text-tn-danger underline ml-1"
              >
                Clear all
            </button>
          )}
        </div>
      </section>

      {/* ── Results Section ────────────────────────────────────────────── */}
      <section>

        {/* Results header + Tab Bar */}
        {searched && !loading && results.length > 0 && (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
                <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Department Tender Results
            </h2>
            <span className="text-xs font-medium text-tn-muted bg-tn-light px-2.5 py-1 rounded-full border border-tn-border">
                {tabResults.length} tender{tabResults.length !== 1 ? 's' : ''} found
            </span>
            </div>

            {/* Tab Bar */}
            <div className="overflow-x-auto mb-5 pb-1">
            <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
            {[
                { id: 'all',       label: 'All',       count: results.length },
                { id: 'ongoing',   label: 'Ongoing',   count: results.filter((t) => t.status === 'Ongoing').length },
                { id: 'upcoming',  label: 'Upcoming',  count: results.filter((t) => t.status === 'Upcoming').length },
                { id: 'completed', label: 'Completed', count: results.filter((t) => t.status === 'Completed').length },
            ].map((tab) => (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                    'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
                    activeTab === tab.id
                    ? 'bg-tn-navy text-white shadow-sm'
                    : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
                ].join(' ')}
                >
                {tab.label}
                <span className={[
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-tn-light text-tn-navy',
                ].join(' ')}>
                    {tab.count}
                </span>
                </button>
            ))}
            </div>
            </div>
        </>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
          </div>
        )}

        {/* Results grid */}
        {!loading && searched && results.length > 0 && (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {tabResults.map((tender) => (
                <div key={tender.id} className="flex">
                <TenderCard 
                    tender={tender}
                    viewMode="grid"
                    className="flex-1"
                    onClick={() => {}}
                />
                </div>
            ))}
            </div>

            {/* Empty tab state */}
            {tabResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center bg-white rounded-xl border border-tn-border border-dashed mt-4">
                <div className="w-12 h-12 rounded-full bg-tn-light flex items-center justify-center mb-3 border border-tn-border">
                <svg className="w-5 h-5 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                </div>
                <p className="font-semibold text-tn-navy mb-1">No {activeTab} tenders</p>
                <p className="text-xs text-tn-muted">
                No tenders in this category for the selected department.
                </p>
            </div>
            )}
        </>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-tn-border border-dashed">
            <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
              <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-tn-navy mb-1">No tenders found</h3>
            <p className="text-sm text-tn-muted max-w-xs">
              No tenders found for <span className="font-semibold">"{selectedDept}"</span>.
            </p>
          </div>
        )}

        {/* Pre-search empty state */}
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-tn-border">
            <div className="w-16 h-16 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-5 border border-[#FFE5BF]">
              <svg className="w-7 h-7 text-tn-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-tn-navy text-base mb-2">
              Search for a department
            </h3>
            <p className="text-sm text-tn-muted max-w-xs leading-relaxed">
              Select a department from the dropdown above
              to browse tenders across Tamil Nadu.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}