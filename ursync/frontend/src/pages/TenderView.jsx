// src/pages/TenderView.jsx
// Usage: navigate('/tender-view', { state: { tender, role } })
// role values: 'department_employee' | 'department_head' | 'administrator' | 'public' | etc.

import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../data/tenderMockData'

// ── Role-based rules ──────────────────────────────────────────────────────────
const ROLE_ALLOWED_STATUSES = {
  department_employee: ['Draft', 'Sent to Head', 'Pending Approval'],
  department_head:     ['Draft', 'Pending Approval', 'Sent to Administrator'],
}

const CAN_EDIT_ROLES = ['department_employee', 'department_head']

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAmount(amt) {
  return '₹ ' + amt
}

function getDurationLabel(days) {
  if (!days) return '—'
  if (days >= 365) return `${(days / 365).toFixed(1)} yrs`
  if (days >= 30)  return `${Math.round(days / 30)} months`
  return `${days} days`
}

// ── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG['Draft']
  return (
    <span className={['inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border', sc.bg, sc.text, sc.border].join(' ')}>
      <span className={['w-2 h-2 rounded-full flex-shrink-0', sc.dot].join(' ')} />
      {status}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Low']
  return (
    <span className={['text-xs font-semibold px-3 py-1.5 rounded-full', pc.bg, pc.text].join(' ')}>
      {priority} Priority
    </span>
  )
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#FFE5BF] bg-[#FFFAF3]">
        <div className="w-8 h-8 rounded-lg bg-[#0A2240] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-[#0A2240]">{title}</h2>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value, accent }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5 border-b border-[#FFF2DB] last:border-0">
      <span className="text-xs font-semibold text-[#6B7A8D] sm:w-44 flex-shrink-0 uppercase tracking-wide">{label}</span>
      <span className={['text-sm flex-1', accent ? 'font-extrabold text-[#0A2240]' : 'text-[#0A2240] font-medium'].join(' ')}>
        {value || '—'}
      </span>
    </div>
  )
}

// ── Timeline Step ─────────────────────────────────────────────────────────────
function TimelineStep({ label, date, active, done, last }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={[
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 text-xs font-bold',
          done   ? 'bg-emerald-500 border-emerald-500 text-white' :
          active ? 'bg-[#1A4A8C] border-[#1A4A8C] text-white' :
                   'bg-white border-[#FFE5BF] text-[#6B7A8D]',
        ].join(' ')}>
          {done ? <CheckIcon /> : <span className="w-2 h-2 rounded-full bg-current" />}
        </div>
        {!last && <div className={['w-0.5 h-8 mt-1', done ? 'bg-emerald-300' : 'bg-[#FFE5BF]'].join(' ')} />}
      </div>
      <div className="pb-4">
        <p className={['text-sm font-semibold', active || done ? 'text-[#0A2240]' : 'text-[#6B7A8D]'].join(' ')}>{label}</p>
        {date && <p className="text-xs text-[#6B7A8D] mt-0.5">{date}</p>}
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',    icon: 'text-[#1A4A8C]',  val: 'text-[#1A4A8C]'  },
    amber:  { bg: 'bg-amber-50',   icon: 'text-amber-600',  val: 'text-amber-700'  },
    emerald:{ bg: 'bg-emerald-50', icon: 'text-emerald-600',val: 'text-emerald-700'},
    red:    { bg: 'bg-red-50',     icon: 'text-red-500',    val: 'text-red-600'    },
  }
  const c = colorMap[color] || colorMap.blue
  return (
    <div className={['rounded-xl p-4 flex flex-col gap-2 border border-[#FFE5BF]', c.bg].join(' ')}>
      <div className={['w-8 h-8 flex items-center justify-center', c.icon].join(' ')}>
        {icon}
      </div>
      <p className="text-xs text-[#6B7A8D] font-medium">{label}</p>
      <p className={['text-lg font-extrabold', c.val].join(' ')}>{value || '—'}</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TenderView() {
  const navigate = useNavigate()
  const location = useLocation()

  // tender and role passed via navigation state
  const tender = location.state?.tender || null
  const role   = location.state?.role   || 'public'

  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Role permission checks ─────────────────────────────────────────────────
  const canEdit = CAN_EDIT_ROLES.includes(role)

  const allowedStatuses = ROLE_ALLOWED_STATUSES[role] || null
  const statusAllowed   = !allowedStatuses || (tender && allowedStatuses.includes(tender.status))

  // If the tender's status isn't in the allowed list for this role → show restricted view
  const showRestricted = canEdit && !statusAllowed

  if (!tender) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-60">
        <p className="text-[#0A2240] font-bold text-lg">No tender selected.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-5 py-2 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  // ── Timeline stages ────────────────────────────────────────────────────────
  const stages = [
    { label: 'Draft Created',           key: 'Draft'                },
    { label: 'Pending Approval',        key: 'Pending Approval'     },
    { label: 'Sent to Head',            key: 'Sent to Head'         },
    { label: 'Sent to Administrator',   key: 'Sent to Administrator'},
    { label: 'Approved',                key: 'Approved'             },
  ]
  const currentIdx = stages.findIndex(s => s.key === tender.status)

  // ── Restricted access banner ───────────────────────────────────────────────
  if (showRestricted) {
    return (
      <div className="p-4 lg:p-6 space-y-5">
        <BackBar onBack={() => navigate(-1)} title="Tender Detail" />
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <LockIcon />
          </div>
          <p className="font-bold text-[#0A2240] text-base">Access Restricted</p>
          <p className="text-sm text-[#6B7A8D] text-center max-w-xs px-4">
            This tender has status <strong>"{tender.status}"</strong>, which is outside your view permissions for this role.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
          >
            Back to Tenders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-28 relative">

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className={[
          'fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold',
          'flex items-center gap-2 max-w-xs',
          toast.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        ].join(' ')}>
          <span className={['w-2 h-2 rounded-full flex-shrink-0', toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'].join(' ')} />
          {toast.msg}
        </div>
      )}

      {/* ── Back + Title bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#FFE5BF]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-[#0A2240] leading-snug">Tender Detail</h1>
            <p className="text-xs text-[#6B7A8D] font-mono">{tender.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={tender.status} />
          <PriorityBadge priority={tender.priority} />
        </div>
      </div>

      {/* ── Hero Image ─────────────────────────────────────────────────── */}
      {tender.image && (
        <div className="w-full h-52 sm:h-64 rounded-2xl overflow-hidden border border-[#FFE5BF] bg-[#FFF2DB]">
          <img
            src={tender.image}
            alt={tender.projectName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ── Project Title + Description ────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 space-y-2">
        <h2 className="text-base font-extrabold text-[#0A2240] leading-snug">{tender.projectName}</h2>
        <p className="text-xs text-[#6B7A8D] font-mono">{tender.department}</p>
        {tender.description && (
          <p className="text-sm text-[#0A2240] leading-relaxed pt-1">{tender.description}</p>
        )}
      </div>

      {/* ── Quick Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<CurrencyIcon />}
          label="Tender Amount"
          value={formatAmount(tender.amount)}
          color="blue"
        />
        <StatCard
          icon={<ClockIcon />}
          label="Duration"
          value={getDurationLabel(tender.duration)}
          color="amber"
        />
        <StatCard
          icon={<UsersIcon />}
          label="Contractors"
          value={tender.contractors ? `${tender.contractors} bidders` : '—'}
          color="emerald"
        />
        <StatCard
          icon={<TagIcon />}
          label="Tender Type"
          value={tender.tenderType}
          color="red"
        />
      </div>

      {/* ── Project Details ─────────────────────────────────────────────── */}
      <SectionCard title="Project Details" icon={<InfoIcon />}>
        <div className="divide-y divide-[#FFF2DB]">
          <InfoRow label="Project Name"  value={tender.projectName} />
          <InfoRow label="Department"    value={tender.department} />
          <InfoRow label="Category"      value={tender.category} />
          <InfoRow label="Tender Type"   value={tender.tenderType} />
          <InfoRow label="Tender ID"     value={tender.id} />
          <InfoRow label="Created Date"  value={formatDate(tender.createdDate)} />
          <InfoRow label="Last Updated"  value={formatDate(tender.lastUpdated)} />
        </div>
      </SectionCard>

      {/* ── Financial & Schedule ───────────────────────────────────────── */}
      <SectionCard title="Financial & Schedule" icon={<CurrencyIconSm />}>
        <div className="divide-y divide-[#FFF2DB]">
          <InfoRow label="Tender Amount"   value={formatAmount(tender.amount)} accent />
          <InfoRow label="Duration"        value={getDurationLabel(tender.duration)} />
          <InfoRow label="Priority"        value={tender.priority} />
          <InfoRow label="Start Date"      value={formatDate(tender.startDate)} />
          <InfoRow label="End Date"        value={formatDate(tender.endDate)} />
          <InfoRow label="Contractors"     value={tender.contractors ? tender.contractors + ' registered' : '—'} />
        </div>
      </SectionCard>

      {/* ── Location ───────────────────────────────────────────────────── */}
      <SectionCard title="Project Location" icon={<LocationIcon />}>
        <div className="divide-y divide-[#FFF2DB]">
          <InfoRow label="District"  value={tender.district} />
          <InfoRow label="Taluk"     value={tender.taluk} />
          <InfoRow label="Village"   value={tender.village} />
        </div>
      </SectionCard>

      {/* ── Approval Timeline ──────────────────────────────────────────── */}
      <SectionCard title="Approval Timeline" icon={<TimelineIcon />}>
        <div className="pt-1">
          {stages.map((stage, idx) => (
            <TimelineStep
              key={stage.key}
              label={stage.label}
              date={idx === currentIdx ? 'Current status · ' + formatDate(tender.lastUpdated) : undefined}
              done={idx < currentIdx && tender.status !== 'Rejected'}
              active={idx === currentIdx}
              last={idx === stages.length - 1}
            />
          ))}
          {tender.status === 'Rejected' && (
            <div className="flex items-center gap-3 mt-2">
              <div className="w-8 h-8 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center flex-shrink-0">
                <XIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-600">Rejected</p>
                <p className="text-xs text-[#6B7A8D] mt-0.5">{formatDate(tender.lastUpdated)}</p>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Document Download ──────────────────────────────────────────── */}
      {tender.documentUrl && (
        <SectionCard title="Documents" icon={<DocIcon />}>
          <a
            href={tender.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-[#FFE5BF] bg-[#FFF2DB] hover:bg-[#FFE5BF] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1A4A8C] flex items-center justify-center flex-shrink-0">
              <PDFIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0A2240] truncate">Tender Document</p>
              <p className="text-xs text-[#6B7A8D]">Click to download / view PDF</p>
            </div>
            <DownloadIcon />
          </a>
        </SectionCard>
      )}

      {/* ── Floating Edit Button (role-gated) ─────────────────────────── */}
      {canEdit && statusAllowed && (
        <button
          onClick={() => navigate('/create-tender', { state: { tender } })}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-[#1A4A8C] text-white shadow-xl hover:bg-[#0A2240] hover:scale-105 hover:shadow-2xl transition-all duration-200 active:scale-95 text-sm font-bold"
          title="Edit Tender"
          aria-label="Edit Tender"
        >
          <EditIcon />
          Edit Tender
        </button>
      )}

    </div>
  )
}

// ── Back bar sub-component ────────────────────────────────────────────────────
function BackBar({ onBack, title }) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-[#FFE5BF]">
      <button
        onClick={onBack}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
      >
        <ChevronLeftIcon />
      </button>
      <h1 className="text-lg font-extrabold text-[#0A2240]">{title}</h1>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const iconProps = { className: 'w-4 h-4 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }
const smIconProps = { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }

function InfoIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function CurrencyIconSm() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function LocationIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function DocIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" /></svg>
}
function TimelineIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
}
function EditIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
}
function ChevronLeftIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
}
function CheckIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
}
function XIcon() {
  return <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
}
function LockIcon() {
  return <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
}
function DownloadIcon() {
  return <svg className="w-4 h-4 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
}
function PDFIcon() {
  return <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
}
function CurrencyIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function ClockIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function UsersIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function TagIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
}