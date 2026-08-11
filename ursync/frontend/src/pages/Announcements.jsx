// src/pages/Announcements.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Mock Data ─────────────────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  {
    id: 1,
    subject: 'eBG to be the only acceptable form of bank guarantee for receiving EMD from 01.06.2026',
    content: 'As per the orders in G.O.Ms.No.158, Finance - Procurement Cell department, dt- 02.07.2025, With effect from 01.06.2026 for all procurement irrespective of value, eBG submitted through the TN portal will be the only acceptable form of bank guarantee for receiving Earnest Money Deposit -EMD.',
    date: '2025-07-02',
  },
  {
    id: 2,
    subject: 'Mandatory Digital Signature Certificate (DSC) for all Tender Submissions',
    content: 'All vendors and contractors are hereby informed that submission of tenders without a valid Class 3 Digital Signature Certificate (DSC) will not be accepted on the Tamil Nadu e-Procurement portal with effect from 01.08.2026.',
    date: '2026-05-15',
  },
  {
    id: 3,
    subject: 'New Tender Module Update — Version 3.2 Released',
    content: 'The Tamil Nadu e-Tender portal has been upgraded to Version 3.2. This update includes improved document upload speed, better mobile compatibility, and enhanced security features. All users are requested to clear their browser cache before logging in.',
    date: '2026-06-01',
  },
]

// ── View Modal ────────────────────────────────────────────────────────────────
function AnnouncementModal({ item, onClose }) {
  if (!item) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="h-1.5 w-full rounded-t-2xl bg-[#1A4A8C]" />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-base font-bold text-[#0A2240] leading-snug">
              {item.subject}
            </h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#FFF2DB] text-[#6B7A8D] hover:bg-[#FFE5BF] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Date */}
          <p className="text-[10px] font-semibold text-[#6B7A8D] uppercase tracking-widest">
            Published: {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>

          {/* Content */}
          <p className="text-sm text-[#6B7A8D] leading-relaxed">
            {item.content}
          </p>

          {/* Close button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] hover:bg-[#FFF2DB] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Announcements() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen animate-fade-in">

      {/* Modal */}
      <AnnouncementModal item={selected} onClose={() => setSelected(null)} />

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A2240]">Announcements</h1>
          <p className="text-sm text-tn-muted mt-1">
            The eTender related announcements are published below.
          </p>
        </div>
      </div>

      {/* ── Announcements Count ───────────────────────────────────────── */}
      <p className="text-sm font-bold text-[#1A4A8C] mb-4">
        No. of Announcements : {ANNOUNCEMENTS.length}
      </p>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden shadow-sm">

        {/* Table Header */}
        <div className="grid grid-cols-[60px_1fr_60px] bg-[#FFFAF3] border-b border-[#FFE5BF] px-5 py-3">
          <p className="text-xs font-bold text-[#0A2240]">S.No</p>
          <p className="text-xs font-bold text-[#0A2240]">Subject / Content</p>
          <p className="text-xs font-bold text-[#0A2240] text-right">View</p>
        </div>

        {/* Table Rows */}
        {ANNOUNCEMENTS.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-3 border border-[#FFE5BF]">
              <svg className="w-5 h-5 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="font-semibold text-[#0A2240] text-sm">No announcements available</p>
            <p className="text-xs text-[#6B7A8D] mt-1">Check back later for updates.</p>
          </div>
        ) : (
          ANNOUNCEMENTS.map((item, idx) => (
            <div
              key={item.id}
              className={[
                'grid grid-cols-[60px_1fr_60px] px-5 py-4 gap-4 items-start',
                'hover:bg-[#FFFAF3] transition-colors',
                idx !== ANNOUNCEMENTS.length - 1 ? 'border-b border-[#FFE5BF]' : '',
              ].join(' ')}
            >
              {/* S.No */}
              <p className="text-sm text-[#6B7A8D] pt-0.5">{idx + 1}</p>

              {/* Subject + Content */}
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[#1A4A8C] leading-snug cursor-pointer hover:underline"
                   onClick={() => setSelected(item)}>
                  {item.subject}
                </p>
                <p className="text-xs text-[#6B7A8D] leading-relaxed line-clamp-2">
                  {item.content}
                </p>
              </div>

              {/* View icon */}
              <div className="flex justify-end pt-0.5">
                <button
                  onClick={() => setSelected(item)}
                  title="View Announcement"
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-[#1A4A8C] hover:bg-[#FFF2DB] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}