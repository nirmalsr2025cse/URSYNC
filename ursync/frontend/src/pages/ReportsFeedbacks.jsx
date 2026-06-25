// src/pages/ReportsFeedbacks.jsx
import React, { useState, useMemo } from 'react'
import { REPORT_MESSAGES, FEEDBACK_MESSAGES } from '../data/reportFeedbackMockData'
import Pagination from '../components/Pagination'
import { useRole } from '../components/RoleContext'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ item, showDept }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="h-1 w-full bg-[#0A2240]" />
      <div className="p-4 flex flex-col flex-1 gap-3">

        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase tracking-wide">{item.id}</p>

        <h3 className="text-sm font-bold text-[#0A2240] leading-snug line-clamp-2">{item.title}</h3>

        <p className="text-xs text-[#6B7A8D] line-clamp-2 leading-relaxed flex-1">{item.description}</p>

        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-3 border-t border-[#FFE5BF]">
          {showDept && (
            <MetaRow icon="building" label={item.department} />
          )}
          <MetaRow icon="tag"      label={'Tender: ' + item.tenderId} />
          <MetaRow icon="calendar" label={'Submitted: ' + formatDate(item.submittedDate)} />
        </div>
      </div>
    </div>
  )
}

// ── Feedback Card ─────────────────────────────────────────────────────────────
function FeedbackCard({ item, showDept }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="h-1 w-full bg-[#1A4A8C]" />
      <div className="p-4 flex flex-col flex-1 gap-3">

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono text-[#6B7A8D] uppercase tracking-wide">{item.id}</p>
          <StarRating rating={item.rating} />
        </div>

        <h3 className="text-sm font-bold text-[#0A2240] leading-snug line-clamp-2">{item.title}</h3>

        <p className="text-xs text-[#6B7A8D] line-clamp-2 leading-relaxed flex-1">{item.description}</p>

        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-3 border-t border-[#FFE5BF]">
          {showDept && (
            <MetaRow icon="building" label={item.department} />
          )}
          <MetaRow icon="user"     label={item.userName} />
          <MetaRow icon="tag"      label={'Tender: ' + item.tenderId} />
          <MetaRow icon="calendar" label={'Submitted: ' + formatDate(item.submittedDate)} />
        </div>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed col-span-full">
      <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
        <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="font-bold text-[#0A2240] mb-1">{label}</p>
      <p className="text-sm text-[#6B7A8D]">Check back later for updates.</p>
    </div>
  )
}

// ── MetaRow ───────────────────────────────────────────────────────────────────
function MetaRow({ icon, label }) {
  const paths = {
    building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5',
    user:     'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    tag:      'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
    calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
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

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'reports',   label: 'Reports'   },
  { id: 'feedbacks', label: 'Feedbacks' },
]

// Department mapping per role — matches your existing project
const ROLE_DEPARTMENT_MAP = {
  department_employee: 'Public Works Department',
  department_head:     'Public Works Department',
}

const PAGE_SIZE = 6

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsFeedbacks() {
  const { role } = useRole()
  const [activeTab,   setActiveTab]   = useState('reports')
  const [currentPage, setCurrentPage] = useState(1)
  const [animating,   setAnimating]   = useState(false)

  // ── Role logic ────────────────────────────────────────────────────────────
  const isDeptRole   = role === 'department_employee' || role === 'department_head'
  const isAdmin      = role === 'administrator'
  const userDept     = ROLE_DEPARTMENT_MAP[role] || null

  // ── Filter cards by department for dept roles ─────────────────────────────
  // Department roles → only their department's cards, no dept label shown
  // Administrator    → all cards, dept label shown
  // Others           → all cards, no dept label
  const reports = useMemo(() => {
    if (isDeptRole && userDept) {
      return REPORT_MESSAGES.filter((r) => r.department === userDept)
    }
    return REPORT_MESSAGES
  }, [role])

  const feedbacks = useMemo(() => {
    if (isDeptRole && userDept) {
      return FEEDBACK_MESSAGES.filter((f) => f.department === userDept)
    }
    return FEEDBACK_MESSAGES
  }, [role])

  // showDept = true only for Administrator
  const showDept = isAdmin

  // ── Active tab data ───────────────────────────────────────────────────────
  const data       = activeTab === 'reports' ? reports : feedbacks
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return data.slice(start, start + PAGE_SIZE)
  }, [data, currentPage])

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setTimeout(() => {
      setActiveTab(id)
      setCurrentPage(1)
      setAnimating(false)
    }, 150)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* ── Page Header + Breadcrumb ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Reports & Feedbacks</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">
            View submitted reports and user feedback regarding Tamil Nadu Government tenders.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7A8D]">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#1A4A8C] font-semibold">Reports & Feedbacks</span>
        </nav>
      </div>

      {/* ── Dept notice for dept roles ─────────────────────────────────── */}
      {isDeptRole && userDept && (
        <div className="flex items-center gap-3 bg-[#FFF2DB] border border-[#FFE5BF] rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-800 font-medium">
            Showing reports and feedbacks for{' '}
            <span className="font-bold">{userDept}</span> only.
          </p>
        </div>
      )}

      {/* ── Tab Bar ────────────────────────────────────────────────────── */}
      <div className="inline-flex items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={[
                'px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-[#0A2240] text-white shadow-sm'
                  : 'text-[#1A4A8C] border border-[#FFE5BF] bg-transparent hover:bg-[#FFF2DB]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Results count ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className={[
          'w-2 h-6 rounded-full',
          activeTab === 'reports' ? 'bg-[#0A2240]' : 'bg-[#1A4A8C]',
        ].join(' ')} />
        <div>
          <h2 className="font-bold text-[#0A2240] text-base">
            {activeTab === 'reports' ? 'Reports' : 'Feedbacks'}
          </h2>
          <p className="text-xs text-[#6B7A8D]">
            {data.length} {activeTab === 'reports' ? 'report' : 'feedback'}{data.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* ── Cards Grid ─────────────────────────────────────────────────── */}
      <div className={[
        'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch transition-opacity duration-150',
        animating ? 'opacity-0' : 'opacity-100',
      ].join(' ')}>
        {paginated.length === 0 && (
          <EmptyState label={
            activeTab === 'reports'
              ? 'No reports available.'
              : 'No feedback available.'
          } />
        )}
        {paginated.map((item) =>
          activeTab === 'reports'
            ? <ReportCard   key={item.id} item={item} showDept={showDept} />
            : <FeedbackCard key={item.id} item={item} showDept={showDept} />
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}