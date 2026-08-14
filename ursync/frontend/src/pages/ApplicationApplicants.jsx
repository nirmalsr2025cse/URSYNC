// src/pages/ApplicationApplicants.jsx
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

function ApplicantCard({ applicant, onView, onApprove, approving, isCompleted }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="h-1 w-full bg-[#1A4A8C]" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#FFF2DB] border border-[#FFE5BF] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0A2240] truncate">{applicant.applicantName}</p>
            <p className="text-xs text-[#6B7A8D] truncate">{applicant.companyName}</p>
          </div>
        </div>

        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{applicant.applicationId}</p>

        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="exp" label={'Experience: ' + applicant.experience} />
          <MetaRow icon="pin" label={applicant.district} />
          <MetaRow icon="cal" label={'Submitted: ' + new Date(applicant.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <MetaRow icon="doc" label={applicant.documents.length + ' documents uploaded'} />
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onView(applicant)}
            className={[
              'flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors',
              isCompleted ? 'w-full' : 'flex-1',
            ].join(' ')}
          >
            View
          </button>
          {!isCompleted && (
            <button
              onClick={() => onApprove(applicant)}
              disabled={approving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors disabled:opacity-50"
            >
              {approving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Approve'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaRow({ icon, label }) {
  const paths = {
    exp: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0',
    pin: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
    cal: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z',
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

export default function ApplicationApplicants() {
  const navigate = useNavigate()
  const { tenderId } = useParams()
  const decodedId = decodeURIComponent(tenderId || '')
  const { apiFetch } = useApi()
  const location = useLocation()
  const fromTab = location.state?.fromTab || 'Open'
  const isCompleted = fromTab === 'Completed'

  const PAGE_SIZE = 6
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [tender, setTender] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [approvingId, setApprovingId] = useState(null)
  const [approvedCount, setApprovedCount] = useState(0)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Pending list = isDocumentApproved !== true
  function loadPending() {
    if (!decodedId) return
    setLoading(true)
    setLoadError(null)
    return apiFetch(`/tenders/applications/applicants?tenderCode=${encodeURIComponent(decodedId)}&approved=false`)
      .then((res) => {
        setTender(res.data.tender)
        setApplicants(res.data.applicants)
      })
      .catch((err) => setLoadError(err.message || 'Failed to load applicants'))
      .finally(() => setLoading(false))
  }

  // Just used for the floating "View List (n)" badge count
  function loadApprovedCount() {
    if (!decodedId) return
    apiFetch(`/tenders/applications/applicants?tenderCode=${encodeURIComponent(decodedId)}&approved=true`)
      .then((res) => setApprovedCount(res.data.applicants.length))
      .catch(() => {})
  }

  useEffect(() => {
    loadPending()
    loadApprovedCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedId])

  async function handleApprove(applicant) {
    setApprovingId(applicant.applicationId)
    try {
      await apiFetch(`/tenders/applications/applicants/${encodeURIComponent(applicant.applicationId)}/approve`, {
        method: 'PATCH',
      })
      // Optimistically remove from the pending list — approved docs live
      // on the /approved page now, driven by isDocumentApproved on the server.
      setApplicants((prev) => prev.filter((a) => a.applicationId !== applicant.applicationId))
      setApprovedCount((c) => c + 1)
      showToast('Applicant Approved Successfully')
    } catch (err) {
      showToast(err.message || 'Failed to approve applicant', 'error')
    } finally {
      setApprovingId(null)
    }
  }

  function handleView(applicant) {
    navigate('/Applicant/' + encodeURIComponent(applicant.applicationId), {
      state: { tenderId: tender.id, fromPath: '/applications' },
    })
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

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/applications', { state: { fromTab } })} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Applicants</h1>
          <p className="text-xs text-[#6B7A8D] mt-0.5">{applicants.length} pending applicants for this tender</p>
        </div>
      </div>

      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{tender.id}</p>
        <h2 className="text-base font-bold text-[#0A2240] mt-1">{tender.title}</h2>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-[#6B7A8D]">
          <span>{tender.department}</span>
          <span>•</span>
          <span>{tender.district}</span>
          <span>•</span>
          <span>{tender.currency} {tender.value?.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <p className="font-semibold text-[#0A2240]">No pending applicants.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {paginated.map((a) => (
            <ApplicantCard
              key={a.applicationId}
              applicant={a}
              onView={handleView}
              onApprove={handleApprove}
              approving={approvingId === a.applicationId}
              isCompleted={isCompleted}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {approvedCount > 0 && (
        <button
          onClick={() => navigate('/applications/' + encodeURIComponent(tender.id) + '/approved', { state: { fromTab } })}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#F62440] text-white shadow-lg hover:bg-red-600 hover:scale-105 transition-all duration-200 font-semibold text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          View List ({approvedCount})
        </button>
      )}
    </div>
  )
}