// src/pages/TenderDetailsView.jsx
// Usage: navigate('/tender-details-view/:id', { state: { tender } })
// Works with DB-backed tender objects (the shape tenderController.js's
// toCardShape() returns): id/tenderCode, title, description, image,
// documentUrl, department, departmentCode, organization, category,
// location, taluk, village, latitude, longitude, value, estimatedValue,
// startDate, closingDate, status, isCancelled, cancelledReason, isRetendered.
//
// Consolidates the old TenderDetailsView.jsx + TenderView.jsx into one
// page: Project Details / Financial & Schedule / Project Location /
// Documents. No Approval Timeline — that belonged to the old mock-based
// draft-tender workflow (projectName/amount/priority fields), which this
// page doesn't use.

import React from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function daysLeft(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatCoord(n) {
  return typeof n === 'number' ? n.toFixed(5) : '—'
}

// ── Status / Category configs ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  'Ongoing':      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  'Upcoming':     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   bar: 'bg-amber-500'   },
  'Completed':    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    bar: 'bg-blue-500'    },
  'Cancelled':    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-400',     bar: 'bg-red-400'     },
}

const CATEGORY_COLORS = {
  'Infrastructure':     'bg-orange-50 text-orange-700',
  'Energy':             'bg-yellow-50 text-yellow-700',
  'Water & Sanitation': 'bg-cyan-50 text-cyan-700',
  'Healthcare':         'bg-red-50 text-red-700',
  'Urban Development':  'bg-purple-50 text-purple-700',
  'Education':          'bg-indigo-50 text-indigo-700',
  'Housing':            'bg-pink-50 text-pink-700',
  'Roads':              'bg-stone-50 text-stone-700',
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG['Ongoing']
  return (
    <span className={[
      'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border',
      sc.bg, sc.text, sc.border,
    ].join(' ')}>
      <span className={['w-2 h-2 rounded-full flex-shrink-0', sc.dot].join(' ')} />
      {status}
    </span>
  )
}

function CategoryBadge({ category }) {
  if (!category) return null
  return (
    <span className={[
      'text-xs font-semibold px-3 py-1.5 rounded-full',
      CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700',
    ].join(' ')}>
      {category}
    </span>
  )
}

// Small badge shown when a tender was retendered — surfaces isRetendered
// without needing a whole separate section for it.
function RetenderNotice({ tender }) {
  if (!tender.isRetendered) return null
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 border bg-indigo-50 border-indigo-200">
      <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <p className="text-sm font-semibold text-indigo-800">
        This tender was retendered{tender.retenderedAt ? ` on ${formatDate(tender.retenderedAt)}` : ''}.
      </p>
    </div>
  )
}

// Notice shown when a tender is cancelled — surfaces cancelledReason.
function CancelledNotice({ tender }) {
  if (!tender.isCancelled) return null
  return (
    <div className="flex items-start gap-3 rounded-xl px-4 py-3 border bg-red-50 border-red-200">
      <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 3.9L2.7 17.5A1.8 1.8 0 004.3 20h15.4a1.8 1.8 0 001.6-2.5L13.7 3.9a1.8 1.8 0 00-3.4 0z" />
      </svg>
      <div>
        <p className="text-sm font-semibold text-red-700">
          This tender was cancelled{tender.cancelledAt ? ` on ${formatDate(tender.cancelledAt)}` : ''}.
        </p>
        {tender.cancelledReason && (
          <p className="text-xs text-red-600/80 mt-0.5">{tender.cancelledReason}</p>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#FFE5BF] bg-[#FFFAF3]">
        <div className="w-8 h-8 rounded-lg bg-[#0A2240] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-[#0A2240]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5 border-b border-[#FFF2DB] last:border-0">
      <span className="text-xs font-semibold text-[#6B7A8D] sm:w-44 flex-shrink-0 uppercase tracking-wide">
        {label}
      </span>
      <span className={[
        'text-sm flex-1',
        accent ? 'font-extrabold text-[#0A2240]' : 'text-[#0A2240] font-medium',
      ].join(' ')}>
        {value || '—'}
      </span>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    blue:    { bg: 'bg-blue-50',    icon: 'text-[#1A4A8C]',   val: 'text-[#1A4A8C]'   },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700'   },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
    red:     { bg: 'bg-red-50',     icon: 'text-red-500',     val: 'text-red-600'     },
  }
  const c = colorMap[color] || colorMap.blue
  return (
    <div className={['rounded-xl p-4 flex flex-col gap-2 border border-[#FFE5BF]', c.bg].join(' ')}>
      <div className={['w-8 h-8 flex items-center justify-center', c.icon].join(' ')}>
        {icon}
      </div>
      <p className="text-xs text-[#6B7A8D] font-medium">{label}</p>
      <p className={['text-lg font-extrabold leading-snug', c.val].join(' ')}>{value || '—'}</p>
    </div>
  )
}

// ── Download button (React.createElement to avoid JSX anchor issues) ──────────
function DownloadButton({ documentUrl, id }) {
  if (!documentUrl) return null
  return React.createElement(
    'a',
    {
      href: documentUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      download: (id || 'tender') + '.pdf',
      className: 'flex items-center gap-3 p-3 rounded-xl border border-[#FFE5BF] bg-[#FFF2DB] hover:bg-[#FFE5BF] transition-colors group cursor-pointer',
    },
    React.createElement(
      'div',
      { className: 'w-10 h-10 rounded-lg bg-[#1A4A8C] flex items-center justify-center flex-shrink-0' },
      React.createElement(
        'svg',
        { className: 'w-5 h-5 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', {
          strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2,
          d: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
        })
      )
    ),
    React.createElement(
      'div',
      { className: 'flex-1 min-w-0' },
      React.createElement('p', { className: 'text-sm font-bold text-[#0A2240] truncate' }, 'Tender Document'),
      React.createElement('p', { className: 'text-xs text-[#6B7A8D]' }, 'Click to download / view PDF')
    ),
    React.createElement(
      'svg',
      { className: 'w-4 h-4 text-[#1A4A8C]', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', {
        strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2,
        d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
      })
    )
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const ip = { className: 'w-4 h-4 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }

function InfoIcon()     { return <svg {...ip}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function FinanceIcon()  { return <svg {...ip}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function DocIcon()      { return <svg {...ip}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" /></svg> }
function LocationIcon() { return <svg {...ip}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }

function CurrencyStatIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function ClockStatIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function PinStatIcon()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
function OrgStatIcon()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg> }

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TenderDetailsView() {
  const navigate = useNavigate()
  const location = useLocation()

  const { id } = useParams()
  const decodedId = id ? decodeURIComponent(id) : null
  const tender = location.state?.tender || null

  if (!tender) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
          <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="font-bold text-[#0A2240] text-lg mb-1">No tender selected.</p>
        <p className="text-sm text-[#6B7A8D] mb-5">Please go back and select a tender to view.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  const sc   = STATUS_CONFIG[tender.status] || STATUS_CONFIG['Ongoing']
  const days = daysLeft(tender.closingDate)
  const isCompleted = tender.status === 'Completed'
  const hasCoords = typeof tender.latitude === 'number' && typeof tender.longitude === 'number'
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${tender.latitude},${tender.longitude}`
    : null

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in">

      {/* ── Back + Title bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#FFE5BF]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-[#0A2240] leading-snug">Tender Details</h1>
            <p className="text-xs text-[#6B7A8D] font-mono mt-0.5">{tender.id}</p>
          </div>
        </div>

        {/* Status + Category */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={tender.status} />
          <CategoryBadge category={tender.category} />
        </div>
      </div>

      {/* ── Cancelled / Retendered notices ─────────────────────────────── */}
      <CancelledNotice tender={tender} />
      <RetenderNotice tender={tender} />

      {/* ── Hero image ─────────────────────────────────────────────────── */}
      {tender.image && (
        <div className="w-full h-52 sm:h-64 rounded-2xl overflow-hidden border border-[#FFE5BF] bg-[#FFF2DB]">
          <img
            src={tender.image}
            alt={tender.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ── Title + description card ────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-5 space-y-2">
        <h2 className="text-base font-extrabold text-[#0A2240] leading-snug">{tender.title}</h2>
        <p className="text-xs text-[#6B7A8D] font-medium">{tender.department}</p>
        {tender.description && (
          <p className="text-sm text-[#0A2240] leading-relaxed pt-1">{tender.description}</p>
        )}
      </div>

      {/* ── Quick Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<CurrencyStatIcon />}
          label="Tender Value"
          value={tender.value}
          color="blue"
        />
        <StatCard
          icon={<OrgStatIcon />}
          label="Organisation"
          value={tender.organization}
          color="emerald"
        />
        <StatCard
          icon={<PinStatIcon />}
          label="Location"
          value={tender.location}
          color="amber"
        />
        <StatCard
          icon={<ClockStatIcon />}
          label={isCompleted ? 'Closed On' : 'Closes On'}
          value={formatDate(tender.closingDate)}
          color={days !== null && days <= 7 && !isCompleted ? 'red' : 'blue'}
        />
      </div>

      {/* ── Days left notice ────────────────────────────────────────────── */}
      {!isCompleted && !tender.isCancelled && days !== null && days >= 0 && (
        <div className={[
          'flex items-center gap-3 rounded-xl px-4 py-3 border',
          days <= 3
            ? 'bg-red-50 border-red-200'
            : 'bg-[#FFF2DB] border-[#FFE5BF]',
        ].join(' ')}>
          <svg className={['w-4 h-4 flex-shrink-0', days <= 3 ? 'text-red-500' : 'text-amber-500'].join(' ')}
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={['text-sm font-semibold', days <= 3 ? 'text-red-700' : 'text-amber-800'].join(' ')}>
            {days === 0
              ? 'Application closes today!'
              : `${days} day${days !== 1 ? 's' : ''} left to apply.`
            }
          </p>
        </div>
      )}

      {/* ── Project Details ──────────────────────────────────────────────── */}
      <SectionCard title="Project Details" icon={<InfoIcon />}>
        <div className="divide-y divide-[#FFF2DB]">
          <InfoRow label="Tender ID"       value={tender.id} />
          <InfoRow label="Title"           value={tender.title} />
          <InfoRow label="Organization"    value={tender.organization} />
          <InfoRow label="Department"      value={tender.department} />
          <InfoRow label="Department Code" value={tender.departmentCode} />
          <InfoRow label="Category"        value={tender.category} />
          <InfoRow label="Status"          value={tender.status} />
        </div>
      </SectionCard>

      {/* ── Financial & Schedule ────────────────────────────────────────── */}
      <SectionCard title="Financial & Schedule" icon={<FinanceIcon />}>
        <div className="divide-y divide-[#FFF2DB]">
          <InfoRow label="Tender Value"  value={tender.value} accent />
          <InfoRow label="Start Date"    value={formatDate(tender.startDate)} />
          <InfoRow label="Closing Date"  value={formatDate(tender.closingDate)} />
          <InfoRow label="Duration"  value={tender.duration} />
          {!isCompleted && !tender.isCancelled && days !== null && (
            <InfoRow
              label="Days Remaining"
              value={days <= 0 ? 'Closed' : days === 0 ? 'Today' : days + ' days'}
            />
          )}
        </div>
      </SectionCard>

      {/* ── Project Location ────────────────────────────────────────────── */}
      <SectionCard title="Project Location" icon={<LocationIcon />}>
        <div className="divide-y divide-[#FFF2DB]">
          <InfoRow label="Location"  value={tender.location} />
          <InfoRow label="Taluk"    value={tender.taluk} />
          <InfoRow label="Village"  value={tender.village} />
          <InfoRow label="Latitude"  value={formatCoord(tender.latitude)} />
          <InfoRow label="Longitude" value={formatCoord(tender.longitude)} />
        </div>
        {hasCoords && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-[#FFE5BF] bg-[#FFF2DB] hover:bg-[#FFE5BF] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1A4A8C] flex items-center justify-center flex-shrink-0">
              <LocationIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0A2240] truncate">View on Map</p>
              <p className="text-xs text-[#6B7A8D]">Open this location in Google Maps</p>
            </div>
            <svg className="w-4 h-4 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
        {!hasCoords && (
          <p className="text-xs text-[#6B7A8D] mt-3">
            Precise coordinates aren't available for this tender.
          </p>
        )}
      </SectionCard>

      {/* ── Documents ───────────────────────────────────────────────────── */}
      <SectionCard title="Documents" icon={<DocIcon />}>
        <DownloadButton documentUrl={tender.documentUrl} id={tender.id} />
        {!tender.documentUrl && (
          <p className="text-sm text-[#6B7A8D] text-center py-4">
            No document available for this tender.
          </p>
        )}
      </SectionCard>

    </div>
  )
}