// src/pages/ApplicationApplicants.jsx
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Pagination from '../components/Pagination'
import { APPLICATION_TENDERS } from '../data/applicationMockData'

// ── Shared approved-list store (per tender) — module level so it persists across pages ──
const approvedStore = {}
export function getApproved(tenderId) {
  return approvedStore[tenderId] || []
}
export function setApproved(tenderId, list) {
  approvedStore[tenderId] = list
}
export function isApproved(tenderId, applicationId) {
  return getApproved(tenderId).some((a) => a.applicationId === applicationId)
}
export function addApproved(tenderId, applicant) {
  if (isApproved(tenderId, applicant.applicationId)) return
  approvedStore[tenderId] = [...getApproved(tenderId), applicant]
}
export function removeApproved(tenderId, applicationId) {
  approvedStore[tenderId] = getApproved(tenderId).filter((a) => a.applicationId !== applicationId)
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      {toast}
    </div>
  )
}

function ApplicantCard({ applicant, tenderId, onView, onApprove, approved, isCompleted }) {
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
          <MetaRow icon="exp"   label={'Experience: ' + applicant.experience} />
          <MetaRow icon="pin"   label={applicant.district} />
          <MetaRow icon="cal"   label={'Submitted: ' + new Date(applicant.submittedDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} />
          <MetaRow icon="doc"   label={applicant.documents.length + ' documents uploaded'} />
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
              onClick={() => !approved && onApprove(applicant)}
              disabled={approved}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-colors',
                approved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed' : 'bg-[#1A4A8C] text-white hover:bg-[#0A2240]',
              ].join(' ')}
            >
              {approved && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {approved ? 'Approved' : 'Approve'}
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

export default function ApplicationApplicants() {
  const navigate  = useNavigate()
  const { tenderId } = useParams()
  const decodedId = decodeURIComponent(tenderId || '')
  const tender    = APPLICATION_TENDERS.find((t) => t.id === decodedId)

  const PAGE_SIZE = 6
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState(null)
  const [, forceRender] = useState(0)

  const approvedCount = tender ? getApproved(tender.id).length : 0

  const location = useLocation()
  const fromTab  = location.state?.fromTab || 'Ongoing'

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleApprove(applicant) {
    addApproved(tender.id, applicant)
    forceRender((n) => n + 1)
    showToast('Applicant Approved Successfully')
  }

  function handleView(applicant) {
    navigate('/Applicant/' + encodeURIComponent(applicant.applicationId), {
      state: { tenderId: tender.id },
    })
  }

  const totalPages = tender ? Math.max(1, Math.ceil(tender.applicants.length / PAGE_SIZE)) : 1
  const paginated  = useMemo(() => {
    if (!tender) return []
    const start = (currentPage - 1) * PAGE_SIZE
    return tender.applicants.slice(start, start + PAGE_SIZE)
  }, [tender, currentPage, PAGE_SIZE])

  if (!tender) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="font-bold text-[#0A2240] mb-2">Tender not found.</p>
        <button onClick={() => navigate('/applications', { state: { fromTab } })} className="text-sm text-[#1A4A8C] underline">Back to Applications</button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-24 min-h-screen animate-fade-in">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/applications', { state: { fromTab } })} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Applicants</h1>
          <p className="text-xs text-[#6B7A8D] mt-0.5">{tender.applicants.length} applicants for this tender</p>
        </div>
      </div>

      {/* Tender info card */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase">{tender.id}</p>
        <h2 className="text-base font-bold text-[#0A2240] mt-1">{tender.title}</h2>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-[#6B7A8D]">
          <span>{tender.department}</span>
          <span>•</span>
          <span>{tender.district}</span>
          <span>•</span>
          <span>{tender.value}</span>
        </div>
      </div>

      {/* Applicants grid */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <p className="font-semibold text-[#0A2240]">No applicants found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {paginated.map((a) => (
            <ApplicantCard
              key={a.applicationId}
              applicant={a}
              tenderId={tender.id}
              onView={handleView}
              onApprove={handleApprove}
              approved={isApproved(tender.id, a.applicationId)}
              isCompleted={tender.sentToDept}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* Floating View List button */}
      {approvedCount > 0 && (
        <button
          onClick={() => navigate('/applications/' + encodeURIComponent(tender.id) + '/approved')}
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
