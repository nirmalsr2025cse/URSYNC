// src/pages/FinalizedBidders.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { APPLICATION_TENDERS } from '../data/applicationMockData'
import { getFinalizedBidders, removeFinalizedBidder } from './BidderList'
import { useRole } from '../components/RoleContext'

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      {toast}
    </div>
  )
}

export default function FinalizedBidders() {
  const navigate  = useNavigate()
  const { tenderId } = useParams()
  const location  = useLocation()
  const decodedId = decodeURIComponent(tenderId || '')
  const fromTab   = location.state?.fromTab || 'Ongoing'
  const fromPath  = location.state?.fromPath
  const tender    = APPLICATION_TENDERS.find((t) => t.id === decodedId)
  const { role } = useRole()

  const PAGE_SIZE = useResponsiveItemsPerPage()
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState(null)
  const [, forceRender] = useState(0)

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

  const finalized = getFinalizedBidders(tender.id)

  const totalPages = Math.max(1, Math.ceil(finalized.length / PAGE_SIZE))
  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return finalized.slice(start, start + PAGE_SIZE)
  }, [finalized, currentPage, PAGE_SIZE])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleRemove(applicationId) {
    removeFinalizedBidder(tender.id, applicationId)
    forceRender((n) => n + 1)
    showToast('Bidder removed from finalized list.')
  }
  function handleSendToHigherAuthority() {
    if (role === 'department_employee') {
        // TODO: wire up actual "send to head" action
        showToast('Sent to Department Head')
    } else if (role === 'department_head') {
        // TODO: wire up actual "send to administrator" action
        showToast('Sent to Administrator')
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-24 min-h-screen animate-fade-in">
      <Toast toast={toast} />

    {/* Header */}
    <div className="flex items-center justify-between gap-4 flex-wrap">
    <div className="flex items-center gap-3">
        <button
        onClick={() => navigate('/bidder-selection/' + encodeURIComponent(tender.id), { state: { fromTab, fromPath } })}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
        >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        </button>
        <div>
        <h1 className="text-xl font-extrabold text-[#0A2240]">Finalized Bidders</h1>
        <p className="text-xs text-[#6B7A8D] mt-0.5">Selected Bidder List — {tender.title}</p>
        </div>
    </div>

    {finalized.length > 0 && (role === 'department_employee' || role === 'department_head') && (
        <button
        onClick={handleSendToHigherAuthority}
        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#F62440] text-white hover:bg-red-600 transition-colors shadow-md flex-shrink-0"
        >
        {role === 'department_employee' ? 'Send to Head' : 'Send to Administrator'}
        </button>
    )}
    </div>

      {/* Finalized list */}
      {finalized.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
            <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-bold text-[#0A2240] mb-1">No bidders finalized yet.</p>
          <p className="text-sm text-[#6B7A8D]">Go back and select bidders to finalize.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {paginated.map((a) => (
              <div key={a.applicationId} className="bg-white border border-emerald-200 rounded-2xl overflow-hidden flex flex-col">
                <div className="h-1 w-full bg-emerald-500" />
                <div className="p-4 flex flex-col flex-1 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0A2240] truncate">{a.applicantName}</p>
                      <p className="text-xs text-[#6B7A8D] truncate">{a.companyName}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
                    <p>Bid Amount: <span className="font-semibold text-[#0A2240]">{a.bidAmount}</span></p>
                    <p>Experience: {a.experience}</p>
                    <p>District: {a.district}</p>
                    <p>Finalized on: {tender.finalizedDate ? new Date(tender.finalizedDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</p>
                  </div>

                  <button
                    onClick={() => handleRemove(a.applicationId)}
                    className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  )
}