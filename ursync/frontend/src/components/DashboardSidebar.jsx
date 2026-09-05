// src/components/DashboardSidebar.jsx
// A separate sidebar used ONLY inside the Dashboard module (Dashboard.jsx).
// It intentionally does not touch the existing Sidebar.jsx — same mobile
// overlay / slide-in mechanics and footer treatment, and matches
// Sidebar.jsx's light (white bg / tn-navy text) look, with collapsible
// sections layered on top since the Dashboard's content structure is
// quite different from the rest of the app.
//
// The 'monthly' top-nav section (MSR Report) renders a different shape
// entirely — a single highlighted "MSR Report" nav item plus a Select
// Year / Select Month filter block, no accordion groups — driven by the
// msrYear/msrMonth props lifted up into Dashboard.jsx.
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole, NAV_CONFIG } from './RoleContext'

function Icon({ name, className }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }
  const paths = {
    home:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15v-6h-6v6H3.75A.75.75 0 013 21V9.75z" />,
    edit:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    users:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    gavel:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21l9-9m0 0l4.5-4.5M12 12L7.5 7.5M21 3l-6 6M15 9l-2.5-2.5" />,
    chart:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    clock:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    trend:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5" />,
    globe:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 014 9 15 15 0 01-4 9 15 15 0 01-4-9 15 15 0 014-9z" />,
    chevron:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />,
  }
  return <svg {...props}>{paths[name] || paths.chart}</svg>
}

// Exported so Dashboard.jsx can reuse the same labels/ids (e.g. for the
// "coming soon" panel copy) without redeclaring them.
export const DESCRIPTIVE_GROUPS = [
  {
    id: 'tenderAnalysis',
    label: 'Tender Analysis',
    icon: 'edit',
    metrics: [
      { id: 'numberWise', label: 'Number Wise' },
      { id: 'valueWise', label: 'Value Wise' },
      { id: 'numberValueWise', label: 'Number / Value Wise' },
      { id: 'percentageWise', label: 'Percentage Wise' },
      { id: 'bidsAwarded', label: 'Bids Awarded' },
    ],
    filter: 'range',
  },
  { id: 'bidderAnalysis', label: 'Bidder Analysis', icon: 'users', metrics: null, filter: 'range' },
  { id: 'bidAnalysis', label: 'Bid Analysis', icon: 'gavel', metrics: null, filter: 'range' },
  {
    id: 'top10Analysis',
    label: 'Top 10 Analysis',
    icon: 'chart',
    metrics: [
      { id: 'numberWise', label: 'Number Wise' },
      { id: 'valueWise', label: 'Value Wise' },
    ],
    filter: 'range',
  },
  {
    id: 'last12Months',
    label: 'Last 12 Months Trend',
    icon: 'clock',
    metrics: [
      { id: 'tendersPublished', label: 'No. of Tenders Published' },
      { id: 'bidsReceived', label: 'No. of Bids Received' },
      { id: 'publishingEntities', label: 'No. of Tender Publishing Entities' },
    ],
    filter: null,
  },
  { id: 'yearOverYear', label: 'Year Over Year', icon: 'trend', metrics: null, filter: 'singleYear' },
]

// Sidebar structure for the "Key Performance Indicators" top-nav section.
// Only Tender Published has a wired-up component today — the other four
// sub-metrics are visible and selectable, same "coming soon" pattern used
// elsewhere in this sidebar for not-yet-built pages.
export const KPI_GROUPS = [
  {
    id: 'analysisOn',
    label: 'Analysis on',
    icon: 'edit',
    metrics: [
      { id: 'tenderPublished', label: 'Tender Published' },
      { id: 'bidsSubmission', label: 'Bids Submission' },
      { id: 'techAndFin', label: 'Tech. and Fin.' },
      { id: 'bidsAwarded', label: 'Bids Awarded' },
      { id: 'bidsValidityPeriod', label: 'Bids Validity period' },
    ],
    filter: 'range',
  },
]

// Sidebar structure for the "Distribution Analysis" top-nav section.
// Percentage Distribution has a Number Wise / Value Wise toggle plus a
// single Financial Year dropdown ('singleYear' — one select, not a
// From/To range). Bidder Distribution has no sub-metrics and no filter at
// all — a single cumulative district-wise view.
export const DISTRIBUTION_GROUPS = [
  {
    id: 'percentageDistribution',
    label: 'Percentage Distribution',
    icon: 'chart',
    metrics: [
      { id: 'numberWise', label: 'Number Wise' },
      { id: 'valueWise', label: 'Value Wise' },
    ],
    filter: 'singleYear',
  },
  {
    id: 'bidderDistribution',
    label: 'Bidder Distribution',
    icon: 'globe',
    metrics: null,
    filter: null,
  },
]

// Which top-nav sections have a groups array (and therefore render the
// filter accordion below instead of "coming soon"). 'monthly' is
// deliberately absent — it has its own dedicated render branch below,
// not a groups accordion.
const GROUPS_BY_TOP_NAV = {
  descriptive: DESCRIPTIVE_GROUPS,
  distribution: DISTRIBUTION_GROUPS,
  kpi: KPI_GROUPS,
}

export default function DashboardSidebar({
  open,
  onClose,
  activeTopNav,
  activeGroup,
  onGroupChange,
  activeMetric,
  onMetricChange,
  financialYears,
  fyFrom,
  fyTo,
  onFyFromChange,
  onFyToChange,
  yearRangeOptions,
  yearRange,
  onYearRangeChange,
  msrMonths,
  msrYear,
  onMsrYearChange,
  msrMonth,
  onMsrMonthChange,
}) {
  const navigate = useNavigate()
  const { role } = useRole()
  // Demo-only: the first NAV_CONFIG entry for the current role is treated as
  // that role's Home page. Swap for real "home route" logic if it lives
  // elsewhere once the backend/auth is connected.
  const homePath = NAV_CONFIG[role]?.[0]?.path || '/'

  const [expanded, setExpanded] = useState(() => new Set([activeGroup]))

  // Whichever group becomes active (including via the top nav switching
  // sections and picking a new default group) should auto-expand, not just
  // the one that was active when the sidebar first mounted.
  useEffect(() => {
    setExpanded((prev) => {
      if (prev.has(activeGroup)) return prev
      return new Set(prev).add(activeGroup)
    })
  }, [activeGroup])

  function toggleGroup(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    onGroupChange?.(id)
  }

  const activeGroupsList = GROUPS_BY_TOP_NAV[activeTopNav] || null

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={[
          'fixed top-0 left-0 z-40 w-72 bg-white border-r border-tn-border',
          'flex flex-col h-screen',
          'transition-transform duration-250 ease-out',
          'lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto lg:flex-shrink-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        aria-label="Dashboard sidebar navigation"
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 bg-tn-navy lg:hidden flex-shrink-0">
          <span className="text-white font-semibold text-sm">Dashboard Menu</span>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-tn-border flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-tn-navy/10 flex items-center justify-center flex-shrink-0">
            <Icon name="chart" className="w-5 h-5 text-tn-navy" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-display font-bold leading-tight truncate text-tn-navy">E-procurement</p>
            <p className="text-[11px] text-tn-muted leading-tight">Dashboard</p>
          </div>
        </div>

        {/* Home */}
        <div className="px-2 pt-3 pb-2 border-b border-tn-border flex-shrink-0">
          <button
            onClick={() => navigate(homePath)}
            className="relative w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium text-tn-muted hover:text-tn-navy hover:bg-tn-light transition-colors"
          >
            <Icon name="home" className="w-4 h-4" />
            Home
          </button>
        </div>

        {/* Nav body */}
        <nav className="overflow-y-auto py-3 px-2 space-y-1.5" style={{ flex: '1 1 0', minHeight: 0 }}>
          {activeTopNav === 'monthly' ? (
            <>
              <p className="px-2 text-[10px] font-semibold text-tn-muted uppercase tracking-wider mb-1">
                Reports
              </p>
              <button
                type="button"
                className="relative w-full flex items-center gap-2.5 pl-4 pr-3 py-3 rounded-xl text-sm font-semibold bg-tn-light text-tn-navy"
              >
                <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-tn-navy" aria-hidden="true" />
                <Icon name="chart" className="w-4 h-4 flex-shrink-0" />
                MSR Report
              </button>

              <div className="px-2 pt-4">
                <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wider mb-2">
                  Financial Year Filter
                </p>
                <div className="bg-tn-navy/5 rounded-lg p-2.5 space-y-2">
                  <label className="block text-[11px] text-tn-muted">
                    Select Year :-
                    <select
                      value={msrYear}
                      onChange={(e) => onMsrYearChange?.(e.target.value)}
                      className="mt-1 w-full bg-white border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy focus:outline-none focus:ring-1 focus:ring-tn-blue/50"
                    >
                      {financialYears.map((fy) => (
                        <option key={fy} value={fy}>{fy}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[11px] text-tn-muted">
                    Select Month :-
                    <select
                      value={msrMonth}
                      onChange={(e) => onMsrMonthChange?.(e.target.value)}
                      className="mt-1 w-full bg-white border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy focus:outline-none focus:ring-1 focus:ring-tn-blue/50"
                    >
                      {msrMonths.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </>
          ) : !activeGroupsList ? (
            <div className="text-center text-tn-muted text-xs px-3 py-10">
              <Icon name="clock" className="w-6 h-6 mx-auto mb-2 opacity-60" />
              This section is coming soon.
            </div>
          ) : (
            <>
              <p className="px-2 text-[10px] font-semibold text-tn-muted uppercase tracking-wider mb-1">
                Apply Filters
              </p>

              {activeGroupsList.map((group) => {
                const isExpanded = expanded.has(group.id)
                const isActiveGroup = activeGroup === group.id
                return (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={[
                        'relative w-full flex items-center justify-between gap-2 pl-4 pr-3 py-3 rounded-xl text-sm font-medium transition-colors',
                        isActiveGroup
                          ? 'bg-tn-light text-tn-navy font-semibold'
                          : 'text-tn-muted hover:bg-tn-light hover:text-tn-navy',
                      ].join(' ')}
                    >
                      {isActiveGroup && (
                        <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-tn-navy" aria-hidden="true" />
                      )}
                      <span className="flex items-center gap-2.5">
                        <Icon name={group.icon} className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{group.label}</span>
                      </span>
                      <Icon
                        name="chevron"
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="pl-4 pr-1 py-2 space-y-2.5">
                        {group.metrics && (
                          <div className="space-y-1">
                            {group.metrics.map((metric) => {
                              const isSelected = isActiveGroup && activeMetric === metric.id
                              return (
                                <button
                                  key={metric.id}
                                  onClick={() => onMetricChange?.(group.id, metric.id)}
                                  className={[
                                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors',
                                    isSelected
                                      ? 'bg-tn-light text-tn-navy font-semibold'
                                      : 'text-tn-muted hover:bg-tn-light hover:text-tn-navy',
                                  ].join(' ')}
                                >
                                  <span
                                    className={[
                                      'w-2.5 h-2.5 rounded-full border flex-shrink-0',
                                      isSelected ? 'bg-tn-navy border-tn-navy' : 'border-tn-muted/50',
                                    ].join(' ')}
                                  />
                                  {metric.label}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {group.filter === 'range' && (() => {
                          const fromIndex = financialYears.indexOf(fyTo)
                          const toIndex = financialYears.indexOf(fyFrom)
                          const fromOptions = fromIndex !== -1 ? financialYears.slice(0, fromIndex + 1) : financialYears
                          const toOptions = toIndex !== -1 ? financialYears.slice(toIndex) : financialYears

                          return (
                            <div className="bg-tn-navy/5 rounded-lg p-2.5 space-y-2">
                              <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide">
                                Financial Year Filter
                              </p>
                              <label className="block text-[11px] text-tn-muted">
                                From:
                                <select
                                  value={fyFrom}
                                  onChange={(e) => onFyFromChange?.(e.target.value)}
                                  disabled={!isActiveGroup}
                                  className="mt-1 w-full bg-white border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy focus:outline-none focus:ring-1 focus:ring-tn-blue/50 disabled:opacity-50"
                                >
                                  {fromOptions.map((fy) => (
                                    <option key={fy} value={fy}>{fy}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block text-[11px] text-tn-muted">
                                To:
                                <select
                                  value={fyTo}
                                  onChange={(e) => onFyToChange?.(e.target.value)}
                                  disabled={!isActiveGroup}
                                  className="mt-1 w-full bg-white border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy focus:outline-none focus:ring-1 focus:ring-tn-blue/50 disabled:opacity-50"
                                >
                                  {toOptions.map((fy) => (
                                    <option key={fy} value={fy}>{fy}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          )
                        })()}

                        {group.filter === 'singleRange' && (
                          <div className="bg-tn-navy/5 rounded-lg p-2.5 space-y-1.5">
                            <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide">
                              Select Year Range
                            </p>
                            <select
                              value={yearRange}
                              onChange={(e) => onYearRangeChange?.(e.target.value)}
                              disabled={!isActiveGroup}
                              className="w-full bg-white border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy focus:outline-none focus:ring-1 focus:ring-tn-blue/50 disabled:opacity-50"
                            >
                              {yearRangeOptions.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {group.filter === 'singleYear' && (
                          <div className="bg-tn-navy/5 rounded-lg p-2.5 space-y-1.5">
                            <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide">
                              Financial Year Filter
                            </p>
                            <select
                              value={fyTo}
                              onChange={(e) => onFyToChange?.(e.target.value)}
                              disabled={!isActiveGroup}
                              className="w-full bg-white border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy focus:outline-none focus:ring-1 focus:ring-tn-blue/50 disabled:opacity-50"
                            >
                              {financialYears.map((fy) => (
                                <option key={fy} value={fy}>{fy}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {!group.metrics && group.filter === null && group.id !== 'bidderDistribution' && (
                          <p className="text-[11px] text-tn-muted italic px-1">More options coming soon.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
          <div className="pb-10" />
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-tn-border bg-white">
          <p className="text-xs text-tn-muted text-center py-3">
            © {new Date().getFullYear()} Govt. of Tamil Nadu
          </p>
        </div>
      </aside>
    </>
  )
}