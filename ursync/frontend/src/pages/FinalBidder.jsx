// src/pages/FinalBidder.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { getFinalBidders, removeFinalBidder } from '../data/finalBidderMockData'
import { useRole } from '../components/RoleContext'

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 max-w-xs">
      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
      {toast}
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
    tag:   'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
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

function FinalBidderCard({ bidder, onView, onRemove, readOnly }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="h-1 w-full bg-[#1A4A8C]" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border bg-blue-50 border-blue-200">
            <svg className="w-5 h-5 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#0A2240] truncate">{bidder.applicantName}</p>
            <p className="text-xs text-[#6B7A8D] truncate">{bidder.companyName}</p>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            {bidder.status}
          </span>
        </div>

        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{bidder.applicationId}</p>

        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="tag"   label={bidder.tenderTitle} />
          <MetaRow icon="money" label={'Bid: ' + bidder.bidAmount} />
          <MetaRow icon="exp"   label={'Experience: ' + bidder.experience} />
          <MetaRow icon="pin"   label={bidder.district} />
          <MetaRow icon="cal"   label={'Submitted: ' + new Date(bidder.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <MetaRow icon="doc"   label={bidder.documents.length + ' documents uploaded'} />
        </div>

        {/* Only View and Remove — Remove hidden when readOnly */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onView(bidder)}
            className={[
              'flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors',
              readOnly ? 'w-full' : 'flex-1',
            ].join(' ')}
          >
            View
          </button>
          {!readOnly && (
            <button
              onClick={() => onRemove(bidder.applicationId)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FinalBidder() {
  const navigate = useNavigate()
  const location = useLocation()
  const PAGE_SIZE = useResponsiveItemsPerPage()
  const { role } = useRole()

  // FinalBidder's own path — passed down to BidderDetails so it knows how to return here
  const rootPath = location.pathname

  const readOnly = !!location.state?.readOnly

  // Where FinalBidder itself should go back to — passed in by whatever page links here.
  // e.g. navigate('/finalbidder', { state: { backTo: '/dashboard' } })
  const backTarget = location.state?.backTo || '/approvement' // ← change fallback to your real route

  const [bidders, setBidders] = useState(() => getFinalBidders())
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleView(bidder) {
    navigate('/Bidder/' + encodeURIComponent(bidder.applicationId), {
      state: { fromFinalList: true, fromPath: rootPath , readOnly},
    })
  }

  function handleRemove(applicationId) {
    removeFinalBidder(applicationId)
    setBidders(getFinalBidders())
    showToast('Bidder removed from final list.')
  }

  function handleBack() {
    navigate(backTarget, { replace: true })
  }

  // ── Role-based action handlers ─────────────────────────────────────────
  function handleApprove() {
    // TODO: wire up actual approve action
    showToast('Approved')
  }
  function handleReject() {
    // TODO: wire up actual reject action
    showToast('Rejected')
  }
  function handlePublish() {
    // TODO: wire up actual publish action
    showToast('Result Published')
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return bidders
    const q = search.toLowerCase()
    return bidders.filter((b) =>
      b.applicantName.toLowerCase().includes(q) ||
      b.companyName.toLowerCase().includes(q) ||
      b.applicationId.toLowerCase().includes(q) ||
      b.tenderTitle.toLowerCase().includes(q)
    )
  }, [bidders, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage, PAGE_SIZE])

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-24 min-h-screen animate-fade-in">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#0A2240]">Final Bidder List</h1>
            <p className="text-xs text-[#6B7A8D] mt-0.5">
              {bidders.length} bidder{bidders.length !== 1 ? 's' : ''} finalized
            </p>
          </div>
        </div>

        {/* Role-based action buttons — top right */}
        {!readOnly && role === 'department_head' && (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-tn-blue text-white hover:bg-tn-blue transition-colors shadow-md"
            >
              Approve
            </button>
            <button
              onClick={handleReject}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#F62440] text-white hover:bg-red-600 transition-colors shadow-md"
            >
              Reject
            </button>
          </div>
        )}

        {!readOnly && role === 'administrator' && (
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#1A4A8C] text-white hover:bg-blue-800 transition-colors shadow-md"
            >
              Publish Result
            </button>
            <button
              onClick={handleReject}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#F62440] text-white hover:bg-red-600 transition-colors shadow-md"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
          placeholder="Search by name, company, tender or application ID..."
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

      {/* Cards */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
            <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="font-bold text-[#0A2240] mb-1">No final bidders found.</p>
          <p className="text-sm text-[#6B7A8D]">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {paginated.map((b) => (
            <FinalBidderCard
              key={b.applicationId}
              bidder={b}
              onView={handleView}
              onRemove={handleRemove}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}