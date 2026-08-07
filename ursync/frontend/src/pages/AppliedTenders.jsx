// src/pages/AppliedTenders.jsx
// Frontend-only page — no backend calls. Uses local mock data
// (MOCK_APPLIED_TENDERS / MOCK_COMPLETED_APPLIED) exactly like before,
// but now follows the same structure/style as ApplyTenders.jsx and
// renders each tender with the shared TenderCard component instead of
// TenderCardGrid.

import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TenderCard from '../components/TenderCard'
import { tenders } from '../data/tenders'
import { FileText, Edit, Eye, CheckCircle2, Clock, Search, X } from 'lucide-react'

const PAGE_SIZE = 6

const TABS = [
  { id: 'applied',   label: 'Applied Tenders',   icon: Clock },
  { id: 'completed', label: 'Completed Tenders', icon: CheckCircle2 },
]

// ── Mock applied tenders dataset combining tenders with applicant data ──────
const MOCK_APPLIED_TENDERS = [
  {
    ...tenders.ongoing[0],
    applicationId: 'APP-2026-001',
    appliedDate: '2026-02-10',
    applicantName: 'HariRam Constructions',
    companyName: 'HariRam Constructions Pvt Ltd',
    companyRegNo: 'TN-REG-88291',
    gstNumber: '33AAAAA0000A1Z5',
    panNumber: 'ABCDE1234F',
    email: 'hari.constructions@gmail.com',
    mobile: '9876543210',
    address: '12, Anna Salai, Guindy',
    district: 'Chennai',
    pinCode: '600032',
    bidAmount: '4500000',
    declarationDate: '2026-02-10',
    status: 'Ongoing',
  },
  {
    ...tenders.ongoing[1],
    applicationId: 'APP-2026-002',
    appliedDate: '2026-02-14',
    applicantName: 'HariRam Constructions',
    companyName: 'HariRam Constructions Pvt Ltd',
    companyRegNo: 'TN-REG-88291',
    gstNumber: '33AAAAA0000A1Z5',
    panNumber: 'ABCDE1234F',
    email: 'hari.constructions@gmail.com',
    mobile: '9876543210',
    address: '12, Anna Salai, Guindy',
    district: 'Chennai',
    pinCode: '600032',
    bidAmount: '12000000',
    declarationDate: '2026-02-14',
    status: 'Ongoing',
  },
  {
    ...tenders.upcoming[0],
    applicationId: 'APP-2026-003',
    appliedDate: '2026-02-18',
    applicantName: 'HariRam Constructions',
    companyName: 'HariRam Constructions Pvt Ltd',
    companyRegNo: 'TN-REG-88291',
    gstNumber: '33AAAAA0000A1Z5',
    panNumber: 'ABCDE1234F',
    email: 'hari.constructions@gmail.com',
    mobile: '9876543210',
    address: '12, Anna Salai, Guindy',
    district: 'Chennai',
    pinCode: '600032',
    bidAmount: '8500000',
    declarationDate: '2026-02-18',
    status: 'Upcoming',
  },
]

const MOCK_COMPLETED_APPLIED = [
  {
    ...tenders.completed[0],
    applicationId: 'APP-2025-089',
    appliedDate: '2025-11-05',
    applicantName: 'HariRam Constructions',
    companyName: 'HariRam Constructions Pvt Ltd',
    companyRegNo: 'TN-REG-88291',
    gstNumber: '33AAAAA0000A1Z5',
    panNumber: 'ABCDE1234F',
    email: 'hari.constructions@gmail.com',
    mobile: '9876543210',
    address: '12, Anna Salai, Guindy',
    district: 'Chennai',
    pinCode: '600032',
    bidAmount: '3200000',
    declarationDate: '2025-11-05',
    status: 'Completed',
  },
  {
    ...tenders.completed[1],
    applicationId: 'APP-2025-094',
    appliedDate: '2025-12-01',
    applicantName: 'HariRam Constructions',
    companyName: 'HariRam Constructions Pvt Ltd',
    companyRegNo: 'TN-REG-88291',
    gstNumber: '33AAAAA0000A1Z5',
    panNumber: 'ABCDE1234F',
    email: 'hari.constructions@gmail.com',
    mobile: '9876543210',
    address: '12, Anna Salai, Guindy',
    district: 'Chennai',
    pinCode: '600032',
    bidAmount: '6700000',
    declarationDate: '2025-12-01',
    status: 'Completed',
  },
]

// ── Local Pagination (same look as ApplyTenders.jsx) ────────────────────────
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

export default function AppliedTenders() {
  const navigate = useNavigate()
  const location = useLocation()
  const rootPath = location.state?.fromPath || location.pathname

  const [activeTab,   setActiveTab]   = useState('applied') // 'applied' | 'completed'
  const [currentPage, setCurrentPage] = useState(1)
  const [animating,   setAnimating]   = useState(false)
  const [search,      setSearch]      = useState('')

  // Choose list based on tab
  const rawList = activeTab === 'applied' ? MOCK_APPLIED_TENDERS : MOCK_COMPLETED_APPLIED

  const tabCounts = {
    applied:   MOCK_APPLIED_TENDERS.length,
    completed: MOCK_COMPLETED_APPLIED.length,
  }

  // ── Live client-side search over the active tab's mock data ─────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return rawList
    const q = search.trim().toLowerCase()
    return rawList.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.department?.toLowerCase().includes(q) ||
        t.applicationId?.toLowerCase().includes(q)
    )
  }, [rawList, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  useEffect(() => { setCurrentPage(1) }, [search, activeTab])

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setCurrentPage(1)
    setTimeout(() => { setActiveTab(id); setAnimating(false) }, 150)
  }

  const handleView = (tender) => {
    navigate('/tender-details-view/' + encodeURIComponent(tender.id), {
      state: { tender, fromPath: rootPath },
    })
  }

  const handleEdit = (tender) => {
    navigate('/apply-tenders/apply', {
      state: { editData: tender, isEdit: true, fromPath: rootPath },
    })
  }

  const hasFilters = !!search

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#1A4A8C]" />
            Applied Tenders
          </h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            Manage your submitted applications and track your completed tender submissions.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7A8D]">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#1A4A8C] font-semibold">Applied Tenders</span>
        </nav>
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'applied'
                  ? 'Search applied tenders by title, ID, application no, or department...'
                  : 'Search completed tenders by title, ID, or department...'
              }
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A8D] hover:text-[#0A2240]"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-[#6B7A8D] hover:text-red-500 underline px-2 self-center whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex w-full sm:w-auto items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
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
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]',
                ].join(' ')}>
                  {tabCounts[tab.id]}
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
              <FileText className="w-6 h-6 text-[#6B7A8D]" />
            </div>
            <p className="font-bold text-[#0A2240] mb-1">No {activeTab} tenders found</p>
            <p className="text-sm text-[#6B7A8D] max-w-xs text-center mb-4">
              {search
                ? `No results match "${search}".`
                : activeTab === 'applied'
                ? 'You have not submitted any active tender applications.'
                : 'No completed tender applications in your history.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0A2240] text-white hover:bg-[#1A4A8C] transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {paginated.map((tender) => (
              <div key={tender.applicationId} className="flex flex-col">
                <TenderCard
                  tender={tender}
                  viewMode="grid"
                  className="flex-1"
                  onClick={() => handleView(tender)}
                  footer={
                    <div className="flex gap-2 mt-2 pt-2 border-t border-[#FFE5BF]">
                      {/* View Button — present on both Applied and Completed tabs */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleView(tender)
                        }}
                        className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0A2240] bg-[#FFFAF3] border border-[#FFE5BF] hover:bg-[#FFE5BF]/40 transition-all duration-200"
                      >
                        <Eye className="w-4 h-4 text-[#1A4A8C]" />
                        View Details
                      </button>

                      {/* Edit Button — only present on Applied tab */}
                      {activeTab === 'applied' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(tender)
                          }}
                          className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#1A4A8C] hover:bg-[#0A2240] shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Tender
                        </button>
                      )}
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}