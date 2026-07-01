// src/pages/BidderList.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { APPLICATION_TENDERS } from '../data/applicationMockData'
import { getApproved } from './ApplicationApplicants'

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 max-w-xs">
      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      {toast}
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const APPROVAL_CONFIG = {
  Approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Pending:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  Rejected: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
  Selected: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
}

function StatusBadge({ status }) {
  const sc = APPROVAL_CONFIG[status] || APPROVAL_CONFIG['Pending']
  return (
    <span className={[
      'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border',
      sc.bg, sc.text, sc.border,
    ].join(' ')}>
      <span className={['w-1.5 h-1.5 rounded-full flex-shrink-0', sc.dot].join(' ')} />
      {status}
    </span>
  )
}

// ── Bidder Card ───────────────────────────────────────────────────────────────
function BidderCard({ applicant, isSelected, onSelect, onRemove }) {
  return (
    <div className={[
      'bg-white border rounded-2xl overflow-hidden flex flex-col',
      'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
      isSelected ? 'border-[#1A4A8C]' : 'border-[#FFE5BF]',
    ].join(' ')}>
      <div className={['h-1 w-full', isSelected ? 'bg-[#1A4A8C]' : 'bg-[#FFE5BF]'].join(' ')} />

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Profile + name */}
        <div className="flex items-center gap-3">
          <div className={[
            'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border',
            isSelected
              ? 'bg-blue-50 border-blue-200'
              : 'bg-[#FFF2DB] border-[#FFE5BF]',
          ].join(' ')}>
            <svg className={['w-5 h-5', isSelected ? 'text-[#1A4A8C]' : 'text-[#6B7A8D]'].join(' ')}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#0A2240] truncate">{applicant.applicantName}</p>
            <p className="text-xs text-[#6B7A8D] truncate">{applicant.companyName}</p>
          </div>
          <StatusBadge status={isSelected ? 'Selected' : applicant.approvalStatus} />
        </div>

        {/* ID */}
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{applicant.applicationId}</p>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="money" label={'Bid: ' + applicant.bidAmount} />
          <MetaRow icon="exp"   label={'Experience: ' + applicant.experience} />
          <MetaRow icon="pin"   label={applicant.district} />
          <MetaRow icon="cal"   label={'Submitted: ' + new Date(applicant.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <MetaRow icon="doc"   label={applicant.documents.length + ' documents uploaded'} />
        </div>

        {/* Action button */}
        <div className="mt-1">
          {isSelected ? (
            <button
              onClick={() => onRemove(applicant.applicationId)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Remove from Selection
            </button>
          ) : (
            <button
              onClick={() => onSelect(applicant)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Select Bidder
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaRow({ icon, label }) {
  const paths = {
    money: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    exp:   'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0',
    pin:   'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
    cal:   'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    doc:   'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z',
  }
  return (
    <div className="flex items-start gap-1.5">
      <svg className="w-3 h-3 mt-px flex-shrink-0 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[icon]} />
      </svg>
      <span className="leading-snug truncate">{label}</span>
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, count, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 mx-auto">
          <svg className="w-5 h-5 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-[#0A2240] text-center mb-2">
          Finalize Bidder Selection?
        </h3>
        <p className="text-sm text-[#6B7A8D] text-center mb-6">
          You have selected <span className="font-bold text-[#0A2240]">{count} bidder{count !== 1 ? 's' : ''}</span>. This will finalize the selection for this tender.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] hover:bg-[#FFF2DB] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#F62440] text-white hover:bg-red-600 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BidderList() {
  const navigate          = useNavigate()
  const { tenderId }      = useParams()
  const location          = useLocation()
  const decodedId         = decodeURIComponent(tenderId || '')
  const fromTab           = location.state?.fromTab || 'Ongoing'
  const PAGE_SIZE         = useResponsiveItemsPerPage()

  const tender = APPLICATION_TENDERS.find((t) => t.id === decodedId)

  // Applicants approved by Tender Authority
  const approvedByAuthority = useMemo(() => getApproved(decodedId), [decodedId])

  // Use approved list if available, else fall back to all applicants
  const applicantPool = approvedByAuthority.length > 0
    ? approvedByAuthority
    : (tender?.applicants || [])

  const [selectedIds,   setSelectedIds]   = useState([])
  const [search,        setSearch]        = useState('')
  const [currentPage,   setCurrentPage]   = useState(1)
  const [toast,         setToast]         = useState(null)
  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [finalized,     setFinalized]     = useState(false)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleSelect(applicant) {
    if (selectedIds.includes(applicant.applicationId)) return
    setSelectedIds((prev) => [...prev, applicant.applicationId])
    showToast(applicant.applicantName + ' selected as bidder.')
  }

  function handleRemove(applicationId) {
    setSelectedIds((prev) => prev.filter((id) => id !== applicationId))
    showToast('Bidder removed from selection.')
  }

  function handleFinalize() {
    setFinalized(true)
    setConfirmOpen(false)
    showToast('Bidder selection finalized successfully!')
    setTimeout(() => navigate('/bidder-selection', { state: { fromTab } }), 1200)
  }

  // Filtered applicant pool
  const filtered = useMemo(() => {
    if (!search.trim()) return applicantPool
    const q = search.toLowerCase()
    return applicantPool.filter((a) =>
      a.applicantName.toLowerCase().includes(q) ||
      a.companyName.toLowerCase().includes(q) ||
      a.applicationId.toLowerCase().includes(q)
    )
  }, [applicantPool, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage, PAGE_SIZE])

  if (!tender) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="font-bold text-[#0A2240] mb-2">Tender not found.</p>
        <button onClick={() => navigate('/bidder-selection')} className="text-sm text-[#1A4A8C] underline">
          Back to Bidder Selection
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-24 min-h-screen animate-fade-in">
      <Toast toast={toast} />
      <ConfirmModal
        open={confirmOpen}
        count={selectedIds.length}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleFinalize}
      />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bidder-selection', { state: { fromTab } })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#0A2240]">Bidder List</h1>
            <p className="text-xs text-[#6B7A8D] mt-0.5">
              {applicantPool.length} applicant{applicantPool.length !== 1 ? 's' : ''} sent by Tender Authority
            </p>
          </div>
        </div>

        {/* Selected count badge */}
        {selectedIds.length > 0 && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {selectedIds.length} bidder{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {/* ── Tender Info ───────────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{tender.id}</p>
        <h2 className="text-base font-bold text-[#0A2240] mt-1">{tender.title}</h2>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-[#6B7A8D]">
          <span>{tender.department}</span>
          <span>•</span>
          <span>{tender.district}</span>
          <span>•</span>
          <span>{tender.value}</span>
        </div>

        {/* Authority notice */}
        <div className="mt-3 flex items-start gap-2 bg-[#FFF2DB] border border-[#FFE5BF] rounded-xl px-3 py-2.5">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-800 font-medium">
            {approvedByAuthority.length > 0
              ? `Showing ${approvedByAuthority.length} applicants approved and sent by Tender Authority.`
              : 'No applicants have been sent by Tender Authority yet. Showing all applicants for review.'
            }
          </p>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
          placeholder="Search by name, company or application ID..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
        />
        {search && (
          <button onClick={() => { setSearch(''); setCurrentPage(1) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A8D] hover:text-[#0A2240]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Section label ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 rounded-full bg-[#1A4A8C]" />
          <div>
            <h2 className="font-bold text-[#0A2240] text-base">Applicant List</h2>
            <p className="text-xs text-[#6B7A8D]">
              {filtered.length} applicant{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
      </div>

      {/* ── Cards ─────────────────────────────────────────────────────── */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
            <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="font-bold text-[#0A2240] mb-1">No applicants found.</p>
          <p className="text-sm text-[#6B7A8D]">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {paginated.map((a) => (
            <BidderCard
              key={a.applicationId}
              applicant={a}
              isSelected={selectedIds.includes(a.applicationId)}
              onSelect={handleSelect}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* ── Floating Finalize button ──────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <button
          onClick={() => setConfirmOpen(true)}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#F62440] text-white shadow-lg hover:bg-red-600 hover:scale-105 transition-all duration-200 font-semibold text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 13l4 4L19 7" />
          </svg>
          Finalize ({selectedIds.length})
        </button>
      )}
    </div>
  )
}