// src/pages/AdminBidderDetails.jsx
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APPLICATION_TENDERS } from '../data/applicationMockData'

function Section({ title, children }) {
  return (
    <div className="bg-white border border-tn-border rounded-2xl p-5 shadow-sm">
      <h2 className="text-sm font-bold text-tn-navy mb-3 pb-3 border-b border-tn-border">{title}</h2>
      {children}
    </div>
  )
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-tn-navy mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  )
}

export default function AdminBidderDetails() {
  const navigate = useNavigate()
  const { applicationId } = useParams()
  const decodedAppId = decodeURIComponent(applicationId || '')

  const tender = APPLICATION_TENDERS.find((t) =>
    t.applicants?.some((a) => a.applicationId === decodedAppId)
  )
  const applicant = tender?.applicants?.find((a) => a.applicationId === decodedAppId)

  if (!tender || !applicant) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] bg-tn-cream">
        <p className="font-bold text-tn-navy mb-2">Bidder not found.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-tn-blue underline">Go Back</button>
      </div>
    )
  }

  const STATUS_STYLE = {
    Pending:  'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen bg-tn-cream animate-fade-in pb-24">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-tn-border bg-white text-tn-muted hover:bg-tn-light transition-colors"
            aria-label="Go back"
          >
            <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-tn-navy">Bidder Details</h1>
            <p className="text-xs text-tn-muted mt-0.5">{applicant.applicationId}</p>
          </div>
        </div>
        <span className={['text-xs font-semibold px-3 py-1.5 rounded-full border', STATUS_STYLE[applicant.approvalStatus] || 'bg-gray-50 text-tn-muted'].join(' ')}>
          {applicant.approvalStatus || 'Pending'}
        </span>
      </div>

      {/* Bid Details Section */}
      <Section title="Bid Details">
        <InfoGrid items={[
          { label: 'Bid Amount', value: applicant.bidAmount },
          { label: 'Tender Value', value: tender.value },
          { label: 'Submitted Date', value: new Date(applicant.submittedDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) }
        ]} />
      </Section>

      {/* Applicant Info Section */}
      <Section title="Applicant Information">
        <InfoGrid items={[
          { label: 'Applicant Name', value: applicant.applicantName },
          { label: 'Mobile Number', value: applicant.mobile },
          { label: 'Email', value: applicant.email },
          { label: 'District', value: applicant.district }
        ]} />
      </Section>

      {/* Company Details Section */}
      <Section title="Company Details">
        <InfoGrid items={[
          { label: 'Company Name', value: applicant.companyName },
          { label: 'Experience', value: applicant.experience }
        ]} />
      </Section>

      {/* Tender Details Section */}
      <Section title="Tender Details">
        <InfoGrid items={[
          { label: 'Tender ID', value: tender.id },
          { label: 'Title', value: tender.title },
          { label: 'Department', value: tender.department },
          { label: 'Value', value: tender.value }
        ]} />
      </Section>

      {/* Documents Section */}
      <Section title="Documents">
        {!applicant.documents || applicant.documents.length === 0 ? (
          <p className="text-sm text-tn-muted text-center py-6">No documents uploaded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {applicant.documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-white border border-tn-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-tn-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium text-tn-navy truncate">{doc.name}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Preview"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-tn-border text-tn-blue hover:bg-tn-light transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </a>
                  <a
                    href={doc.url}
                    download
                    title="Download"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-tn-border text-tn-blue hover:bg-tn-light transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Action Bar */}
      <div className="bg-white border border-tn-border rounded-2xl shadow-sm px-4 py-4 lg:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-tn-border text-tn-navy bg-white hover:bg-tn-light transition-colors"
          >
            Back to Bidder List
          </button>
        </div>
      </div>
    </div>
  )
}
