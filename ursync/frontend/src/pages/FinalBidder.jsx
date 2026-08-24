// src/pages/FinalBidder.jsx
//
// Reached from the Approvement Bidders tab (Approvement.jsx) via a single
// route: /finalbidder/:tenderCode.
//
// Single field drives everything: isBidderApproved.
//   - false -> card lives in the MAIN list, has a View + Approve button.
//     Approve flips isBidderApproved to true (PATCH .../:id/approve),
//     moving the card into the final list.
//   - true  -> card lives in the FINAL list ("View List"), has a
//     View + Reject button. Reject flips isBidderApproved back to false
//     (PATCH .../:id/reject), moving it back to the main list.
//
// The final list also has a "Finalize Bidders" button
// (PATCH /finalbidders/tender/:tenderCode/finalize) that locks the tender
// (Tender.isFinalizedBidders = true).
//
// One shared confirmation modal is reused for approve / reject / finalize
// — only its title/body copy changes per action (see CONFIRM_COPY).

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { useApi } from '../api/client'

function Toast({ toast }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className={[
      'fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold',
      'flex items-center gap-2 max-w-xs',
      isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ].join(' ')}>
      <span className={['w-2 h-2 rounded-full flex-shrink-0', isError ? 'bg-red-500' : 'bg-emerald-500'].join(' ')} />
      {toast.msg}
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
    mail:  'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
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

// listView: 'main' -> Approve button. 'final' -> Reject button.
// Shows FULL details on the card itself (not trimmed like ApplicantDetails).
function FinalBidderCard({ bidder, listView, onView, onApprove, onReject, busy }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className={['h-1 w-full', bidder.isBidderApproved ? 'bg-emerald-500' : 'bg-[#1A4A8C]'].join(' ')} />
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
            <p className="text-xs text-[#6B7A8D] truncate">{bidder.companyName || '—'}</p>
          </div>
          {bidder.isBidderApproved ? (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              In Final List
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1.5 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              {bidder.status}
            </span>
          )}
        </div>

        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{bidder.applicationId}</p>

        {/* Full details — nothing trimmed */}
        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="tag"   label={bidder.tenderTitle} />
          <MetaRow icon="money" label={'Bid: ₹ ' + Number(bidder.bidAmount || 0).toLocaleString('en-IN')} />
          <MetaRow icon="exp"   label={'Experience: ' + (bidder.experience || '—')} />
          <MetaRow icon="pin"   label={bidder.district || '—'} />
          {bidder.mobile && <MetaRow icon="phone" label={bidder.mobile} />}
          {bidder.email && <MetaRow icon="mail" label={bidder.email} />}
          <MetaRow icon="cal"   label={'Submitted: ' + (bidder.submittedDate ? new Date(bidder.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')} />
          <MetaRow icon="doc"   label={(bidder.documentCount ?? (bidder.documents || []).length) + ' documents uploaded'} />
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onView(bidder)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors"
          >
            View
          </button>

          {listView === 'main' ? (
            <button
              onClick={() => onApprove(bidder)}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-tn-blue text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
          ) : (
            <button
              onClick={() => onReject(bidder)}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-tn-sky text-white border border-tn-sky hover:bg-tn-sky transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-1 bg-[#FFE5BF]" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#FFE5BF]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 bg-[#FFE5BF] rounded" />
            <div className="h-3 w-1/3 bg-[#FFE5BF] rounded" />
          </div>
        </div>
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

// Copy for the single shared confirmation modal — content changes per action.
const CONFIRM_COPY = {
  approve: (bidder) => ({
    title: 'Add to Final List',
    body: (
      <>Add <span className="font-bold text-[#0A2240]">{bidder?.applicantName}</span> to the final bidder list?</>
    ),
    confirmLabel: 'Approve',
    confirmClass: 'bg-tn-blue text-white',
  }),
  reject: (bidder) => ({
    title: 'Remove from Final List',
    body: (
      <>Remove <span className="font-bold text-[#0A2240]">{bidder?.applicantName}</span> from the final bidder list? They'll move back to the main list.</>
    ),
    confirmLabel: 'Reject',
    confirmClass: 'bg-red-600 text-white',
  }),
  finalize: () => ({
    title: 'Finalize Bidders',
    body: (
      <>Are you sure you want to finalize the bidder list for this tender? Once finalized, bidders can no longer be added or removed.</>
    ),
    confirmLabel: 'Finalize',
    confirmClass: 'bg-emerald-600 text-white',
  }),
}

function ConfirmModal({ confirmModal, onCancel, onConfirm, working }) {
  if (!confirmModal) return null
  const copy = CONFIRM_COPY[confirmModal.type](confirmModal.bidder)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
        <h3 className="text-base font-bold text-[#0A2240] text-center mb-2">{copy.title}</h3>
        <p className="text-sm text-[#6B7A8D] text-center mb-6 leading-6">{copy.body}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={working}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] hover:bg-[#FFF2DB] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={working}
            className={['flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50', copy.confirmClass].join(' ')}
          >
            {working ? 'Please wait…' : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FinalBidder() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tenderCode } = useParams()
  const PAGE_SIZE = useResponsiveItemsPerPage()
  const { apiFetch } = useApi()

  const rootPath = location.pathname

  // Sidebar highlight chain — always forward whatever fromPath we were
  // handed (falls back to /approvement at the very start of the chain).
  const sidebarFromPath = location.state?.fromPath || '/approvement'
  const backTarget = location.state?.backTo || sidebarFromPath

  // 'main' -> not-yet-approved bidders. 'final' -> the "View List".
  // Restored from nav state so returning from BidderDetails lands back on
  // whichever list you were viewing.
  const [listView, setListView] = useState(location.state?.initialView === 'final' ? 'final' : 'main')

  const [bidders, setBidders] = useState([])
  const [tenderMeta, setTenderMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState(null)

  const [confirmModal, setConfirmModal] = useState(null) // { type: 'approve'|'reject'|'finalize', bidder? }
  const [working, setWorking] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function fetchBidders() {
    if (!tenderCode) return
    setLoading(true)
    setError(null)
    apiFetch(`/finalbidders/by-tender/${encodeURIComponent(tenderCode)}`)
      .then((res) => {
        setBidders(res.data || [])
        setTenderMeta(res.tender || null)
      })
      .catch((err) => setError(err.message || 'Failed to load bidder applications.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBidders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderCode])

  // Split purely on isBidderApproved — the one field driving both lists.
  const mainList = useMemo(() => bidders.filter((b) => !b.isBidderApproved), [bidders])
  const finalList = useMemo(() => bidders.filter((b) => b.isBidderApproved), [bidders])
  const activeList = listView === 'final' ? finalList : mainList

  const filtered = useMemo(() => {
    if (!search.trim()) return activeList
    const q = search.toLowerCase()
    return activeList.filter((b) =>
      (b.applicantName || '').toLowerCase().includes(q) ||
      (b.companyName || '').toLowerCase().includes(q) ||
      (b.applicationId || '').toLowerCase().includes(q) ||
      (b.tenderTitle || '').toLowerCase().includes(q)
    )
  }, [activeList, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage, PAGE_SIZE])

  useEffect(() => { setCurrentPage(1) }, [search, listView])

  function switchListView(next) {
    if (next === listView) return
    setListView(next)
    setSearch('')
  }

  function handleView(bidder) {
    navigate(
      '/Bidder/' + encodeURIComponent(tenderCode) + '/' + encodeURIComponent(bidder.applicationId),
      {
        state: {
          fromFinalList: listView === 'final',
          backTo: rootPath,
          fromPath: sidebarFromPath,   // keep the Approvement sidebar highlight alive
          initialView: listView,       // so Back restores the same list tab
        },
      }
    )
  }

  function handleApproveClick(bidder) { setConfirmModal({ type: 'approve', bidder }) }
  function handleRejectClick(bidder) { setConfirmModal({ type: 'reject', bidder }) }
  function handleFinalizeClick() { setConfirmModal({ type: 'finalize' }) }

  function handleConfirm() {
    if (!confirmModal) return
    setWorking(true)

    if (confirmModal.type === 'approve') {
      const bidder = confirmModal.bidder
      apiFetch(`/finalbidders/${bidder.recordId}/approve`, { method: 'PATCH' })
        .then(() => {
          showToast(`${bidder.applicantName} added to the final list.`, 'success')
          setBidders((prev) => prev.map((b) => b.recordId === bidder.recordId ? { ...b, isBidderApproved: true, status: 'Approved' } : b))
          setConfirmModal(null)
        })
        .catch((err) => showToast(err.message || 'Failed to approve bidder.', 'error'))
        .finally(() => setWorking(false))
      return
    }

    if (confirmModal.type === 'reject') {
      const bidder = confirmModal.bidder
      apiFetch(`/finalbidders/${bidder.recordId}/reject`, { method: 'PATCH' })
        .then(() => {
          showToast(`${bidder.applicantName} removed from the final list.`, 'error')
          setBidders((prev) => prev.map((b) => b.recordId === bidder.recordId ? { ...b, isBidderApproved: false, status: 'Document Verified' } : b))
          setConfirmModal(null)
        })
        .catch((err) => showToast(err.message || 'Failed to reject bidder.', 'error'))
        .finally(() => setWorking(false))
      return
    }

    if (confirmModal.type === 'finalize') {
      apiFetch(`/finalbidders/tender/${encodeURIComponent(tenderCode)}/finalize`, { method: 'PATCH' })
        .then(() => {
          showToast('Bidders finalized successfully.', 'success')
          setTenderMeta((prev) => prev ? { ...prev, isFinalizedBidders: true } : prev)
          setConfirmModal(null)
          // Send the user back to Approvement (Tenders tab is Approvement's
          // default activeTab) instead of leaving them on a now-stale page.
          navigate(backTarget, { replace: true, state: { fromPath: sidebarFromPath } })
        })
        .catch((err) => showToast(err.message || 'Failed to finalize bidders.', 'error'))
        .finally(() => setWorking(false))
      return
    }
  }

  function handleBack() {
    navigate(backTarget, { replace: true, state: { fromPath: sidebarFromPath } })
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-24 min-h-screen animate-fade-in">
      <Toast toast={toast} />
      <ConfirmModal
        confirmModal={confirmModal}
        working={working}
        onCancel={() => !working && setConfirmModal(null)}
        onConfirm={handleConfirm}
      />

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
            <h1 className="text-xl font-extrabold text-[#0A2240]">
              {listView === 'final' ? 'Final Bidder List' : 'Bidder Applications'}
            </h1>
            <p className="text-xs text-[#6B7A8D] mt-0.5">
              {tenderMeta?.title ? tenderMeta.title + ' · ' : ''}
              {mainList.length} pending · {finalList.length} in final list
              {tenderMeta?.isFinalizedBidders ? ' · Finalized' : ''}
            </p>
          </div>
        </div>

        {/* View List toggle */}
        <div className="inline-flex items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1">
          <button
            onClick={() => switchListView('main')}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
              listView === 'main' ? 'bg-[#0A2240] text-white shadow-sm' : 'text-[#1A4A8C] hover:bg-[#FFF2DB]',
            ].join(' ')}
          >
            Applicants
            <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded-full', listView === 'main' ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]'].join(' ')}>
              {mainList.length}
            </span>
          </button>
          <button
            onClick={() => switchListView('final')}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
              listView === 'final' ? 'bg-[#0A2240] text-white shadow-sm' : 'text-[#1A4A8C] hover:bg-[#FFF2DB]',
            ].join(' ')}
          >
            View List
            <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded-full', listView === 'final' ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]'].join(' ')}>
              {finalList.length}
            </span>
          </button>
        </div>
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, tender or application ID..."
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

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 border-dashed">
          <p className="font-bold text-red-600 mb-1">Couldn't load bidder applications.</p>
          <p className="text-sm text-[#6B7A8D] mb-4">{error}</p>
          <button
            onClick={fetchBidders}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Cards */}
      {!error && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
            <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
              <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-bold text-[#0A2240] mb-1">
              {listView === 'final' ? 'No bidders in the final list yet.' : 'No applicants left to review.'}
            </p>
            <p className="text-sm text-[#6B7A8D]">
              {listView === 'final' ? 'Approve applicants from the Applicants tab to add them here.' : 'Try adjusting your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {paginated.map((b) => (
              <FinalBidderCard
                key={b.applicationId}
                bidder={b}
                listView={listView}
                onView={handleView}
                onApprove={handleApproveClick}
                onReject={handleRejectClick}
                busy={working}
              />
            ))}
          </div>
        )
      )}

      {!loading && !error && filtered.length > 0 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      {/* Finalize Bidders — only actionable from the final list */}
      {listView === 'final' && !loading && !error && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-[#FFE5BF] px-4 py-4 lg:px-6 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[#6B7A8D]">
              {tenderMeta?.isFinalizedBidders
                ? 'This tender\'s bidder list has already been finalized.'
                : `${finalList.length} bidder${finalList.length !== 1 ? 's' : ''} in the final list.`}
            </p>
            <button
              onClick={handleFinalizeClick}
              disabled={tenderMeta?.isFinalizedBidders || finalList.length === 0}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalize Bidders
            </button>
          </div>
        </div>
      )}
    </div>
  )
}