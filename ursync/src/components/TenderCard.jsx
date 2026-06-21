import React from 'react'

// ── Status styles — supports both old and new status values ──────────────────
const STATUS_STYLES = {
  // Old (TendersByLocation page)
  'Open':         'bg-green-50 text-tn-success border-green-200',
  'Closing Soon': 'bg-amber-50 text-amber-700 border-amber-200',
  'Closed':       'bg-red-50 text-tn-danger border-red-200',
  // New (Home page)
  'Ongoing':      'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Upcoming':     'bg-amber-50 text-amber-700 border-amber-200',
  'Completed':    'bg-blue-50 text-blue-700 border-blue-200',
}

const STATUS_BAR = {
  'Ongoing':   'bg-emerald-500',
  'Upcoming':  'bg-amber-500',
  'Completed': 'bg-blue-500',
  'Open':      'bg-green-500',
  'Closing Soon': 'bg-amber-500',
  'Closed':    'bg-red-400',
}

const STATUS_DOT = {
  'Ongoing':      'bg-emerald-500',
  'Upcoming':     'bg-amber-500',
  'Completed':    'bg-blue-500',
  'Open':         'bg-green-500',
  'Closing Soon': 'bg-amber-500',
  'Closed':       'bg-red-400',
}

const CATEGORY_COLORS = {
  'Infrastructure':       'bg-orange-50 text-orange-700',
  'Energy':               'bg-yellow-50 text-yellow-700',
  'Water & Sanitation':   'bg-cyan-50 text-cyan-700',
  'Healthcare':           'bg-red-50 text-red-700',
  'Urban Development':    'bg-purple-50 text-purple-700',
  'Education':            'bg-indigo-50 text-indigo-700',
  'Housing':              'bg-pink-50 text-pink-700',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function daysLeft(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

// ── Main TenderCard ──────────────────────────────────────────────────────────
export default function TenderCard({ tender, highlighted, onClick, viewMode = 'grid' }) {
  const days       = daysLeft(tender.closingDate)
  const isCompleted = tender.status === 'Completed' || tender.status === 'Closed'
  const statusStyle = STATUS_STYLES[tender.status] || STATUS_STYLES['Open']
  const barColor    = STATUS_BAR[tender.status]    || 'bg-tn-blue'
  const dotColor    = STATUS_DOT[tender.status]    || 'bg-tn-blue'

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <article
        onClick={onClick}
        className={[
          'card cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4 p-4',
          'animate-fade-in group',
          highlighted ? 'ring-2 ring-tn-gold ring-offset-2' : '',
        ].join(' ')}
        aria-label={`Tender: ${tender.title}`}
      >
        {/* Status dot + ID */}
        <div className="flex items-center gap-3 sm:w-48 flex-shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
          <div>
            <p className="text-[10px] font-mono text-tn-muted uppercase tracking-wide">
              {tender.id}
            </p>
            <span className={[
              'text-[10px] font-semibold px-2 py-0.5 rounded border',
              statusStyle,
            ].join(' ')}>
              {tender.status}
            </span>
          </div>
        </div>

        {/* Title + dept */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-tn-navy truncate
                         group-hover:text-tn-blue transition-colors">
            {tender.title}
          </h3>
          <p className="text-xs text-tn-muted truncate mt-0.5">
            {tender.department || tender.organization}
          </p>
        </div>

        {/* Value + date */}
        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 flex-shrink-0">
          {tender.value && (
            <p className="text-sm font-bold text-tn-navy">{tender.value}</p>
          )}
          <p className="text-xs text-tn-muted">
            {isCompleted ? 'Closed ' : 'Closes '}{formatDate(tender.closingDate)}
          </p>
          {!isCompleted && days !== null && days >= 0 && (
            <span className={[
              'text-[10px] font-bold px-2 py-0.5 rounded',
              days <= 3 ? 'bg-red-50 text-tn-danger' : 'bg-tn-light text-tn-blue',
            ].join(' ')}>
              {days === 0 ? 'Today' : `${days}d left`}
            </span>
          )}
        </div>
      </article>
    )
  }

  // ── GRID VIEW (default) ────────────────────────────────────────────────────
  return (
    <article
      onClick={onClick}
      className={[
        'card cursor-pointer flex flex-col overflow-hidden group animate-fade-in',
        highlighted ? 'ring-2 ring-tn-gold ring-offset-2' : '',
      ].join(' ')}
      aria-label={`Tender: ${tender.title}`}
    >
      {/* Top color bar */}
      <div className={`h-1 w-full flex-shrink-0 ${barColor}`} />

      {/* Image (shown only if tender has one) */}
      {tender.image && (
        <div className="relative h-36 overflow-hidden bg-tn-light flex-shrink-0">
          <img
            src={tender.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {highlighted && (
            <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-tn-gold animate-pulse-soft" />
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-2">

        {/* Status + Category row */}
        <div className="flex items-start justify-between gap-2">
          <span className={[
            'text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1.5',
            statusStyle,
          ].join(' ')}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
            {tender.status}
          </span>

          {tender.category && (
            <span className={[
              'text-[10px] font-medium px-2 py-0.5 rounded-full',
              CATEGORY_COLORS[tender.category] || 'bg-gray-50 text-tn-muted',
            ].join(' ')}>
              {tender.category}
            </span>
          )}
        </div>

        {/* Tender ID */}
        <p className="text-[10px] font-mono text-tn-muted uppercase tracking-wide">
          {tender.id}
        </p>

        {/* Title */}
        <h3 className="text-sm font-semibold text-tn-navy leading-snug line-clamp-2
                       group-hover:text-tn-blue transition-colors">
          {tender.title}
        </h3>

        {/* Description (only if present) */}
        {tender.description && (
          <p className="text-xs text-tn-muted line-clamp-2 leading-relaxed">
            {tender.description}
          </p>
        )}

        {/* Meta */}
        <div className="mt-auto space-y-1.5 text-xs text-tn-muted pt-2 border-t border-tn-border">
          {(tender.organization || tender.department) && (
            <MetaRow icon={<BuildingIcon />} label={tender.organization || tender.department} />
          )}
          {tender.department && tender.organization && tender.department !== tender.organization && (
            <MetaRow icon={<DeptIcon />} label={tender.department} />
          )}
          {tender.location && (
            <MetaRow icon={<PinIcon />} label={tender.location} />
          )}
          <div className="flex items-center justify-between pt-1">
            <MetaRow
              icon={<CalIcon />}
              label={(isCompleted ? 'Closed: ' : 'Closes: ') + formatDate(tender.closingDate)}
            />
            {!isCompleted && days !== null && days >= 0 && (
              <span className={[
                'text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0',
                days <= 3 ? 'bg-red-50 text-tn-danger' : 'bg-tn-light text-tn-blue',
              ].join(' ')}>
                {days === 0 ? 'Today' : `${days}d left`}
              </span>
            )}
          </div>
        </div>

        {/* Value */}
        {tender.value && (
          <p className="text-xs font-bold text-tn-navy bg-tn-light px-2 py-1 rounded text-center">
            {tender.value}
          </p>
        )}
      </div>
    </article>
  )
}

// ── Skeleton loader (unchanged) ───────────────────────────────────────────────
export function TenderCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-36 rounded-none" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="space-y-1.5 pt-2 border-t border-tn-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-3 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Shared subcomponents ──────────────────────────────────────────────────────
function MetaRow({ icon, label }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-px flex-shrink-0 text-tn-blue">{icon}</span>
      <span className="leading-snug truncate">{label}</span>
    </div>
  )
}

const iconProps = {
  className: 'w-3 h-3',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
}

function BuildingIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}
function DeptIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function CalIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}