// src/pages/ApprovedApplicants.jsx
import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APPLICATION_TENDERS } from '../data/applicationMockData'
import { getApproved, removeApproved } from './ApplicationApplicants'

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      {toast}
    </div>
  )
}

function ConfirmModal({ open, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 mx-auto">
          <svg className="w-5 h-5 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-[#0A2240] text-center mb-2">Send to Department?</h3>
        <p className="text-sm text-[#6B7A8D] text-center mb-6">
          This will finalize the approved applicants and move this tender to Completed. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] hover:bg-[#FFF2DB] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#F62440] text-white hover:bg-red-600 transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ApprovedApplicants() {
  const navigate  = useNavigate()
  const { tenderId } = useParams()
  const decodedId = decodeURIComponent(tenderId || '')
  const tender    = APPLICATION_TENDERS.find((t) => t.id === decodedId)

  const [, forceRender] = useState(0)
  const [toast, setToast] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!tender) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="font-bold text-[#0A2240] mb-2">Tender not found.</p>
        <button onClick={() => navigate('/applications')} className="text-sm text-[#1A4A8C] underline">Back to Applications</button>
      </div>
    )
  }

  const approved = getApproved(tender.id)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleRemove(applicationId) {
    removeApproved(tender.id, applicationId)
    forceRender((n) => n + 1)
    showToast('Applicant removed successfully.')
  }

  function handleSendToDept() {
    tender.sentToDept   = true
    tender.status       = 'Completed'
    tender.sentDate     = new Date().toISOString().split('T')[0]
    tender.approvedCount = approved.length
    setConfirmOpen(false)
    showToast('Tender Sent to Department')
    setTimeout(() => navigate('/applications'), 1200)
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-24 min-h-screen animate-fade-in">
      <Toast toast={toast} />
      <ConfirmModal open={confirmOpen} onCancel={() => setConfirmOpen(false)} onConfirm={handleSendToDept} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Approved Applicants</h1>
          <p className="text-xs text-[#6B7A8D] mt-0.5">Selected Bidder List — {tender.title}</p>
        </div>
      </div>

      {/* Approved list */}
      {approved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
            <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-bold text-[#0A2240] mb-1">No applicants approved yet.</p>
          <p className="text-sm text-[#6B7A8D]">Go back and approve applicants to add them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {approved.map((a) => (
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
                  <p>Approved on: {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
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
      )}

      {/* Send to Department */}
      {approved.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setConfirmOpen(true)}
            className="px-10 py-3.5 rounded-xl text-sm font-bold bg-[#F62440] text-white hover:bg-red-600 transition-colors shadow-md"
          >
            Send to Department
          </button>
        </div>
      )}
    </div>
  )
}