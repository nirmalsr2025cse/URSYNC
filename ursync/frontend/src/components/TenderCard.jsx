import React from 'react'

const STATUS_CONFIG = {
  'Open':         { badge: 'bg-green-50 text-green-700 border-green-200',       dot: 'bg-green-500',   bar: 'bg-green-500'   },
  'Closing Soon': { badge: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   bar: 'bg-amber-500'   },
  'Closed':       { badge: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-400',     bar: 'bg-red-400'     },
  'Ongoing':      { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  'Upcoming':     { badge: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   bar: 'bg-amber-500'   },
  'Completed':    { badge: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    bar: 'bg-blue-500'    },
}

const CATEGORY_COLORS = {
  'Infrastructure':     'bg-orange-50 text-orange-600',
  'Energy':             'bg-yellow-50 text-yellow-600',
  'Water & Sanitation': 'bg-cyan-50 text-cyan-600',
  'Healthcare':         'bg-red-50 text-red-600',
  'Urban Development':  'bg-purple-50 text-purple-600',
  'Education':          'bg-indigo-50 text-indigo-600',
  'Housing':            'bg-pink-50 text-pink-600',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function daysLeft(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24))
}

function DownloadBtn({ tender }) {
  var url = tender && tender.documentUrl ? tender.documentUrl : null

  function handleClick(e) {
    e.stopPropagation()
  }

  if (url) {
    return React.createElement(
      'a',
      {
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        download: tender.id + '-tender.pdf',
        onClick: handleClick,
        title: 'Download Tender Document',
        className: 'flex-shrink-0 w-8 h-8 flex items-center justify-center bg-tn-light border border-tn-border rounded-lg text-tn-muted hover:bg-tn-blue hover:border-tn-blue hover:text-white transition-all duration-200 cursor-pointer',
      },
      React.createElement(
        'svg',
        { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
        })
      )
    )
  }

  return React.createElement(
    'div',
    {
      title: 'Document not available',
      className: 'flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg text-gray-300 cursor-not-allowed',
    },
    React.createElement(
      'svg',
      { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
      })
    )
  )
}

export default function TenderCard({ tender, highlighted, onClick, viewMode, className , footer = false }) {
  highlighted = highlighted || false
  viewMode = viewMode || 'grid'
  className = className || ''

  var days = daysLeft(tender.closingDate)
  var isCompleted = tender.status === 'Completed' || tender.status === 'Closed'
  var sc = STATUS_CONFIG[tender.status] || STATUS_CONFIG['Open']

  if (viewMode === 'list') {
    return (
      <article
        onClick={onClick}
        className={[
          'bg-white border border-tn-border rounded-2xl p-4',
          'flex flex-col sm:flex-row sm:items-center gap-4',
          'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group',
          'animate-fade-in w-full',
          highlighted ? 'ring-2 ring-tn-gold ring-offset-2' : '',
          className,
        ].join(' ')}
      >
        <div className="flex items-center gap-3 sm:w-48 flex-shrink-0">
          <span className={'w-2.5 h-2.5 rounded-full flex-shrink-0 ' + sc.dot} />
          <div>
            <p className="text-[10px] font-mono text-tn-muted uppercase tracking-wide">{tender.id}</p>
            <span className={'text-[10px] font-semibold px-2 py-0.5 rounded border ' + sc.badge}>
              {tender.status}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-tn-navy truncate group-hover:text-tn-blue transition-colors">
            {tender.title}
          </h3>
          <p className="text-xs text-tn-muted truncate mt-0.5">
            {tender.department || tender.organization}
          </p>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 flex-shrink-0">
          {tender.value && <p className="text-sm font-bold text-tn-navy">{tender.value}</p>}
          <p className="text-xs text-tn-muted">
            {isCompleted ? 'Closed ' : 'Closes '}{formatDate(tender.closingDate)}
          </p>
          {!isCompleted && days !== null && days >= 0 && (
            <span className={'text-[10px] font-bold px-2 py-0.5 rounded ' + (days <= 3 ? 'bg-red-50 text-tn-danger' : 'bg-tn-light text-tn-blue')}>
              {days === 0 ? 'Today' : days + 'd left'}
            </span>
          )}
        </div>
      </article>
    )
  }

  return (
    <article
      onClick={onClick}
      className={[
        'bg-white border border-tn-border rounded-2xl overflow-hidden',
        'flex flex-col cursor-pointer group animate-fade-in w-full',
        'hover:shadow-lg hover:-translate-y-1 transition-all duration-200',
        highlighted ? 'ring-2 ring-tn-gold ring-offset-2' : '',
        className,
      ].join(' ')}
    >
      <div className={'h-1 w-full flex-shrink-0 ' + sc.bar} />

      <div className="relative h-40 overflow-hidden bg-tn-light flex-shrink-0">
        {tender.image ? (
          <img
            src={tender.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-tn-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
        {highlighted && (
          <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-tn-gold animate-pulse-soft" />
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className={['inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border', sc.badge].join(' ')}>
            <span className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + sc.dot} />
            {tender.status}
          </span>
          {tender.category && (
            <span className={['text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', CATEGORY_COLORS[tender.category] || 'bg-gray-50 text-tn-muted'].join(' ')}>
              {tender.category}
            </span>
          )}
        </div>

        <p className="text-[10px] font-mono text-tn-muted uppercase tracking-wide">{tender.id}</p>

        <h3 className="text-sm font-semibold text-tn-navy leading-snug line-clamp-2 group-hover:text-tn-blue transition-colors">
          {tender.title}
        </h3>

        {tender.description && (
          <p className="text-xs text-tn-muted line-clamp-1 leading-relaxed">{tender.description}</p>
        )}

        <div className="mt-auto space-y-1.5 text-xs text-tn-muted pt-2 border-t border-tn-border">
          {tender.organization && <MetaRow icon={<BuildingIcon />} label={tender.organization} />}
          {tender.department && tender.department !== tender.organization && (
            <MetaRow icon={<DeptIcon />} label={tender.department} />
          )}
          {tender.location && <MetaRow icon={<PinIcon />} label={tender.location} />}
          <div className="flex items-center justify-between pt-1">
            <MetaRow
              icon={<CalIcon />}
              label={(isCompleted ? 'Closed: ' : 'Closes: ') + formatDate(tender.closingDate)}
            />
            {!isCompleted && days !== null && days >= 0 && (
              <span className={'text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ' + (days <= 3 ? 'bg-red-50 text-tn-danger' : 'bg-tn-light text-tn-blue')}>
                {days === 0 ? 'Today' : days + 'd left'}
              </span>
            )}
          </div>
        </div>
            
        {tender.value && (
          <div className="flex items-center gap-2 mt-1">
            <p className="flex-1 text-xs font-bold text-tn-navy bg-tn-light px-2 py-1.5 rounded-lg text-center">
              {tender.value}
            </p>
            <DownloadBtn tender={tender} />
          </div>
        )}
        {footer && (
          <div className="mt-3 pt-3 border-t border-[#FFE5BF]">
            {footer}
          </div>
        )}
      </div>
      
    </article>
  )
}

export function TenderCardSkeleton() {
  return (
    <div className="bg-white border border-tn-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-1 bg-tn-border" />
      <div className="h-40 bg-tn-light" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-20 bg-tn-border rounded-full" />
          <div className="h-5 w-16 bg-tn-border rounded-full" />
        </div>
        <div className="h-3 w-28 bg-tn-border rounded" />
        <div className="h-4 w-full bg-tn-border rounded" />
        <div className="h-4 w-3/4 bg-tn-border rounded" />
        <div className="space-y-1.5 pt-2 border-t border-tn-border">
          <div className="h-3 w-full bg-tn-border rounded" />
          <div className="h-3 w-3/4 bg-tn-border rounded" />
          <div className="h-3 w-full bg-tn-border rounded" />
        </div>
        <div className="h-7 w-full bg-tn-border rounded-lg" />
      </div>
    </div>
  )
}

function MetaRow({ icon, label }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-px flex-shrink-0 text-tn-blue">{icon}</span>
      <span className="leading-snug truncate">{label}</span>
    </div>
  )
}

const ip = { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }

function BuildingIcon() {
  return (
    <svg {...ip}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}
function DeptIcon() {
  return (
    <svg {...ip}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg {...ip}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function CalIcon() {
  return (
    <svg {...ip}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
