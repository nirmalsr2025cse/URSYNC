// src/pages/AdminBidderList.jsx
import React, { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APPLICATION_TENDERS } from '../data/applicationMockData'

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

function ApplicantCard({ applicant, onView }) {
  const statusStyles = {
    Pending:  'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="bg-white border border-tn-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="h-1 w-full bg-tn-blue" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-tn-light border border-tn-border flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-tn-navy truncate">{applicant.applicantName}</p>
              <p className="text-xs text-tn-muted truncate">{applicant.companyName}</p>
            </div>
          </div>
          <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full border', statusStyles[applicant.approvalStatus] || 'bg-gray-50 text-tn-muted'].join(' ')}>
            {applicant.approvalStatus || 'Pending'}
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-tn-muted pt-2 border-t border-tn-border flex-1">
          <p className="font-mono text-[10px] text-tn-muted uppercase tracking-wide mb-1">{applicant.applicationId}</p>
          <div className="grid grid-cols-2 gap-2">
            <p>Bid: <span className="font-bold text-tn-navy">{applicant.bidAmount}</span></p>
            <p>Experience: <span className="font-semibold text-tn-navy">{applicant.experience}</span></p>
            <p>District: <span className="font-semibold text-tn-navy">{applicant.district}</span></p>
            <p>Submitted: <span className="font-semibold text-tn-navy">{new Date(applicant.submittedDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span></p>
          </div>
          <p className="mt-2 text-[10px] font-medium text-tn-blue flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
            {applicant.documents?.length || 0} documents uploaded
          </p>
        </div>

        <button
          onClick={() => onView(applicant.applicationId)}
          className="mt-2 w-full py-2.5 text-xs font-semibold rounded-xl border border-tn-border bg-tn-light text-tn-navy hover:bg-tn-light transition-colors flex items-center justify-center gap-1.5"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

export default function AdminBidderList() {
  const navigate = useNavigate()
  const { tenderId } = useParams()
  const decodedId = decodeURIComponent(tenderId || '')

  const tender = useMemo(() => {
    return APPLICATION_TENDERS.find((t) => t.id === decodedId)
  }, [decodedId])

  const [query, setQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [, forceUpdate] = useState(0)

  if (!tender) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] bg-tn-cream">
        <p className="font-bold text-tn-navy mb-2">Tender not found.</p>
        <button onClick={() => navigate('/bidder-list')} className="text-sm text-tn-blue underline">Back to Bidder List</button>
      </div>
    )
  }

  const applicants = tender.applicants || []

  const filtered = useMemo(() => {
    if (!query.trim()) return applicants
    const q = query.toLowerCase()
    return applicants.filter(
      (a) =>
        a.applicantName.toLowerCase().includes(q) ||
        a.companyName.toLowerCase().includes(q) ||
        a.applicationId.toLowerCase().includes(q)
    )
  }, [query, applicants])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleApprove = () => {
    applicants.forEach(a => a.approvalStatus = 'Approved')
    tender.sentToDept = true
    tender.status = 'Completed'
    tender.sentDate = new Date().toISOString().split('T')[0]
    tender.approvedCount = applicants.length
    showToast('Tender Bidder Selection Approved')
    forceUpdate(n => n + 1)
    setTimeout(() => {
      navigate('/bidder-list')
    }, 1500)
  }

  const handleReject = () => {
    applicants.forEach(a => a.approvalStatus = 'Rejected')
    tender.sentToDept = true
    tender.status = 'Completed'
    tender.sentDate = new Date().toISOString().split('T')[0]
    tender.approvedCount = 0
    showToast('Tender Bidder Selection Rejected', 'error')
    forceUpdate(n => n + 1)
    setTimeout(() => {
      navigate('/bidder-list')
    }, 1500)
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in bg-tn-cream">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bidder-list')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-tn-border bg-white text-tn-muted hover:bg-tn-light transition-colors"
            aria-label="Go back"
          >
            <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-tn-navy">Bidder List</h1>
            <p className="text-xs text-tn-muted mt-0.5">
              {applicants.length} applicants sent by Tender Authority
            </p>
          </div>
        </div>

        {!tender.sentToDept && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleReject}
              className="rounded-xl bg-tn-danger text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-red-700 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
            <button
              onClick={handleApprove}
              className="rounded-xl bg-tn-blue text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-tn-navy transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
          </div>
        )}
      </div>

      {/* Tender Summary Info Card */}
      <div className="bg-white border border-tn-border rounded-2xl p-5 shadow-sm space-y-2">
        <span className="text-[10px] font-mono text-tn-muted uppercase tracking-wide">{tender.id}</span>
        <h2 className="text-base font-extrabold text-tn-navy leading-snug">{tender.title}</h2>
        <p className="text-xs text-tn-muted">
          {tender.department} &bull; {tender.location} &bull; <span className="font-bold text-tn-navy">{tender.value}</span>
        </p>
        
        <div className="mt-3 flex items-center gap-2 p-3 bg-tn-light border border-tn-border rounded-xl text-xs text-tn-navy">
          <svg className="w-4 h-4 text-tn-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No applicants have been sent by Tender Authority yet. Showing all applicants for review.</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company or application ID..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-tn-border rounded-xl bg-white text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue transition-all"
        />
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between border-b border-tn-border pb-2">
        <h3 className="text-sm font-bold text-tn-navy">Applicant List</h3>
        <span className="text-xs text-tn-muted font-medium bg-white px-2.5 py-1 border border-tn-border rounded-full">
          {filtered.length} applicants found
        </span>
      </div>

      {/* Applicant Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((applicant) => (
          <ApplicantCard
            key={applicant.applicationId}
            applicant={applicant}
            onView={(appId) => navigate(`/bidder-list/details/${encodeURIComponent(appId)}`, { state: { tenderId: tender.id } })}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 bg-white rounded-2xl border border-tn-border border-dashed">
          <p className="text-sm text-tn-muted">No applicants match your search query.</p>
        </div>
      )}
    </div>
  )
}
