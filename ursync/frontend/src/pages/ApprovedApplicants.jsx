// src/pages/ApprovedApplicants.jsx
//
// Shows bidders whose isDocumentApproved flag is true for this tender.
// "Reject" flips isDocumentApproved back to false server-side, which
// sends the applicant back to ApplicationApplicants.jsx's pending list.
// "Send to Department" finalizes the whole approved set: copies them into
// FinalBidders and sets Tender.isDocumentVerified = true, which moves the
// tender into the Completed tab.

import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Pagination from '../components/Pagination'
import { useApi } from '../api/client'

function Toast({ toast }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className={[
      'fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2',
      isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ].join(' ')}>
      <span className={['w-2 h-2 rounded-full flex-shrink-0', isError ? 'bg-red-500' : 'bg-emerald-500'].join(' ')} />
      {toast.msg}
    </div>
  )
}

// Confirmation modal for the "Send to Department" action.
function ConfirmModal({ open, count, busy, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={busy ? undefined : onCancel}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-11 h-11 rounded-full bg-[#FFF2DB] border border-[#FFE5BF] flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-[#0A2240] mb-2">Send to Department?</h3>
        <p className="text-sm text-[#6B7A8D] leading-relaxed mb-6">
          This will finalize {count} approved applicant{count !== 1 ? 's' : ''} for this tender and send them to
          the department. Once confirmed, this tender will move to the Completed tab and this action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-[#FFE5BF] text-[#0A2240] bg-white hover:bg-[#FFF2DB] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors disabled:opacity-50"
          >
            {busy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

function ApprovedCard({ applicant, onView, onReject, rejecting }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="h-1 w-full bg-emerald-500" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0A2240] truncate">{applicant.applicantName}</p>
            <p className="text-xs text-[#6B7A8D] truncate">{applicant.companyName}</p>
          </div>
        </div>

        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{applicant.applicationId}</p>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onView(applicant)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors"
          >
            View
          </button>
          <button
            onClick={() => onReject(applicant)}
            disabled={rejecting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {rejecting ? (
              <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              'Reject'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ApprovedApplicants() {
  const navigate = useNavigate()
  const { tenderId } = useParams()
  const decodedId = decodeURIComponent(tenderId || '')
  const { apiFetch } = useApi()
  const location = useLocation()
  const fromTab = location.state?.fromTab || 'Open'

  const PAGE_SIZE = 6
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [tender, setTender] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [rejectingId, setRejectingId] = useState(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function loadApproved() {
    if (!decodedId) return
    setLoading(true)
    setLoadError(null)
    apiFetch(`/tenders/applications/applicants?tenderCode=${encodeURIComponent(decodedId)}&approved=true`)
      .then((res) => {
        setTender(res.data.tender)
        setApplicants(res.data.applicants)
      })
      .catch((err) => setLoadError(err.message || 'Failed to load approved applicants'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadApproved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedId])

  async function handleReject(applicant) {
    setRejectingId(applicant.applicationId)
    try {
      await apiFetch(`/tenders/applications/applicants/${encodeURIComponent(applicant.applicationId)}/reject`, {
        method: 'PATCH',
      })
      setApplicants((prev) => prev.filter((a) => a.applicationId !== applicant.applicationId))
      showToast('Applicant moved back to pending')
    } catch (err) {
      showToast(err.message || 'Failed to reject applicant', 'error')
    } finally {
      setRejectingId(null)
    }
  }

  function handleView(applicant) {
    navigate('/Applicant/' + encodeURIComponent(applicant.applicationId), {
      state: { tenderId: tender.id, fromPath: '/applications' },
    })
  }

  async function handleConfirmSend() {
    setSending(true)
    try {
      await apiFetch('/tenders/applications/applicants/send-to-department', {
        method: 'PATCH',
        body: JSON.stringify({ tenderCode: tender.id }),
      })
      setConfirmOpen(false)
      showToast('Sent to department successfully')
      setTimeout(() => {
        navigate('/applications', { state: { fromTab: 'Completed' } })
      }, 1000)
    } catch (err) {
      showToast(err.message || 'Failed to send to department', 'error')
      setSending(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(applicants.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return applicants.slice(start, start + PAGE_SIZE)
  }, [applicants, currentPage])

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#1A4A8C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !tender) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="font-bold text-[#0A2240] mb-2">{loadError || 'Tender not found.'}</p>
        <button onClick={() => navigate('/applications', { state: { fromTab } })} className="text-sm text-[#1A4A8C] underline">Back to Applications</button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-24 min-h-screen animate-fade-in">
      <Toast toast={toast} />
      <ConfirmModal
        open={confirmOpen}
        count={applicants.length}
        busy={sending}
        onCancel={() => !sending && setConfirmOpen(false)}
        onConfirm={handleConfirmSend}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/applications/' + encodeURIComponent(tender.id), { state: { fromTab } })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#0A2240]">Approved Applicants</h1>
            <p className="text-xs text-[#6B7A8D] mt-0.5">{applicants.length} approved for this tender</p>
          </div>
        </div>

        {applicants.length > 0 && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            Send to Department
          </button>
        )}
      </div>

      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{tender.id}</p>
        <h2 className="text-base font-bold text-[#0A2240] mt-1">{tender.title}</h2>
      </div>

      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <p className="font-semibold text-[#0A2240]">No approved applicants yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {paginated.map((a) => (
            <ApprovedCard
              key={a.applicationId}
              applicant={a}
              onView={handleView}
              onReject={handleReject}
              rejecting={rejectingId === a.applicationId}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}