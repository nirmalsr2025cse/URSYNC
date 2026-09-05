// src/pages/Dashboard.jsx
//
// Dashboard module. The persistent app Navbar ("Tamil Nadu Government")
// stays visible above this page — Layout.jsx only skips the "Preview as"
// RoleSwitcher bar and the existing Sidebar for the /dashboard route, since
// this page has its own top nav + DashboardSidebar instead. This page fills
// the remaining height under the Navbar (h-full, not h-screen).
//
// Each metric is its own component (one page = one component); this file
// just picks which one to render based on the sidebar's activeGroup /
// activeMetric — add the next metric's component the same way.
//
// Built so far: Descriptive Analysis → Tender Analysis, Top 10 Analysis,
// Last 12 Months Trend, Bidder Analysis, Bid Analysis, Year Over Year;
// Key Performance Indicators → Tender Published, Bids Submission,
// Tech. and Fin., Bids Awarded, Bids Validity period; Distribution
// Analysis → Percentage Distribution, Bidder Distribution; and
// Monthly Report → MSR Report. Every other sidebar/top-nav entry is
// visible and clickable but renders a "coming soon" panel — intentional,
// so the structure is ready for the rest later.
//
// 'monthly' (Monthly Report) is special-cased: it has no sidebar
// group/metric structure (see DashboardSidebar's 'monthly' branch), so its
// component is resolved directly instead of going through
// GROUP_METRIC_COMPONENTS/GROUP_COMPONENTS, and it reads msrYear/msrMonth
// instead of fyFrom/fyTo.
import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useApi } from '../api/client'
import DashboardSidebar, { DESCRIPTIVE_GROUPS, KPI_GROUPS, DISTRIBUTION_GROUPS } from '../components/DashboardSidebar'
import Icon from '../components/Icon'
import NumberWiseAnalysis from './dashboard/NumberWiseAnalysis'
import ValueWiseAnalysis from './dashboard/ValueWiseAnalysis'
import NumberValueWiseAnalysis from './dashboard/NumberValueWiseAnalysis'
import PercentageWiseAnalysis from './dashboard/PercentageWiseAnalysis'
import BidsAwardedAnalysis from './dashboard/BidsAwardedAnalysis'
import BidderWiseAnalysis from './dashboard/BidderWiseAnalysis'
import BidAnalysis from './dashboard/BidAnalysis'
import NumberWiseTop10Analysis from './dashboard/NumberWiseTop10Analysis'
import ValueWiseTop10Analysis from './dashboard/ValueWiseTop10Analysis'
import TendersPublishedTrend from './dashboard/TendersPublishedTrend'
import BidsReceivedTrend from './dashboard/BidsReceivedTrend'
import TenderPublishingEntitiesTrend from './dashboard/TenderPublishingEntitiesTrend'
import YearOverYearAnalysis from './dashboard/YearOverYearAnalysis'
import KpiTenderPublishedAnalysis from './dashboard/KpiTenderPublishedAnalysis'
import KpiBidsSubmissionAnalysis from './dashboard/KpiBidsSubmissionAnalysis'
import KpiTechAndFinAnalysis from './dashboard/KpiTechAndFinAnalysis'
import KpiBidsAwardedAnalysis from './dashboard/KpiBidsAwardedAnalysis'
import KpiBidsValidityAnalysis from './dashboard/KpiBidsValidityAnalysis'
import NumberWisePercentageDistribution from './dashboard/NumberWisePercentageDistribution'
import ValueWisePercentageDistribution from './dashboard/ValueWisePercentageDistribution'
import BidderDistributionAnalysis from './dashboard/BidderDistributionAnalysis'
import MsrReport from './dashboard/MsrReport'
import { FINANCIAL_YEARS, YEAR_RANGE_OPTIONS, MSR_MONTHS, getDefaultRollingFyRange } from '../utils/financialYearUtils'

const DEFAULT_OVERVIEW_STATS = [
  { label: 'Tenders Published', value: '-', sub: '2007 – Till Date', icon: 'doc', tone: 'blue' },
  { label: 'Tender Value (Approx.)', value: '-', sub: 'Cumulative Value', icon: 'rupee', tone: 'emerald' },
  { label: 'Bids Received', value: '-', sub: 'Cumulative', icon: 'inbox', tone: 'amber' },
  { label: 'Organizations', value: '-', sub: 'Registered', icon: 'building', tone: 'navy' },
  { label: 'Bidders', value: '-', sub: 'Registered', icon: 'users', tone: 'red' },
  { label: 'Dept. Users', value: '-', sub: 'Active Users', icon: 'usercheck', tone: 'slate' },
]

const TOP_NAV_ITEMS = [
  { id: 'descriptive', label: 'Descriptive Analysis' },
  { id: 'distribution', label: 'Distribution Analysis' },
  { id: 'kpi', label: 'Key Performance Indicators' },
  { id: 'monthly', label: 'Monthly Report' },
]

// Top-nav sections that currently have real content wired up. Any other
// section always shows "coming soon", regardless of what activeGroup
// happens to be left over from before. 'monthly' has no groups/metrics of
// its own (see ActiveMetricComponent below) but is still "built".
const BUILT_TOP_NAV = ['descriptive', 'distribution', 'kpi', 'monthly']

// The default group + metric to select whenever a top-nav section becomes
// active (first visit, or switching back to it) — keeps the sidebar's
// highlighted item in sync with what the top nav shows. 'monthly'
// deliberately has no entry here since it has no group/metric concept.
const TOP_NAV_DEFAULTS = {
  descriptive: { group: 'tenderAnalysis', metric: 'numberWise' },
  distribution: { group: 'percentageDistribution', metric: 'numberWise' },
  kpi: { group: 'analysisOn', metric: 'tenderPublished' },
}

// Maps [group][metric] -> component, for any sidebar group that has radio
// sub-metrics (Tender Analysis, Top 10 Analysis, Last 12 Months Trend, KPI
// Analysis on, Percentage Distribution, ...). Groups/metrics not listed
// here fall back to the ComingSoonPanel. Metric ids here must match
// DashboardSidebar's group definitions exactly or the lookup misses and
// this silently falls through to "coming soon".
const GROUP_METRIC_COMPONENTS = {
  tenderAnalysis: {
    numberWise: NumberWiseAnalysis,
    valueWise: ValueWiseAnalysis,
    numberValueWise: NumberValueWiseAnalysis,
    percentageWise: PercentageWiseAnalysis,
    bidsAwarded: BidsAwardedAnalysis,
  },
  top10Analysis: {
    numberWise: NumberWiseTop10Analysis,
    valueWise: ValueWiseTop10Analysis,
  },
  last12Months: {
    tendersPublished: TendersPublishedTrend,
    bidsReceived: BidsReceivedTrend,
    publishingEntities: TenderPublishingEntitiesTrend,
  },
  analysisOn: {
    tenderPublished: KpiTenderPublishedAnalysis,
    bidsSubmission: KpiBidsSubmissionAnalysis,
    techAndFin: KpiTechAndFinAnalysis,
    bidsAwarded: KpiBidsAwardedAnalysis,
    bidsValidityPeriod: KpiBidsValidityAnalysis,
  },
  percentageDistribution: {
    numberWise: NumberWisePercentageDistribution,
    valueWise: ValueWisePercentageDistribution,
  },
}

// Groups with no sidebar sub-metrics (just the FY filter, or nothing at
// all) render straight off activeGroup instead of going through
// GROUP_METRIC_COMPONENTS.
const GROUP_COMPONENTS = {
  bidderAnalysis: BidderWiseAnalysis,
  bidAnalysis: BidAnalysis,
  yearOverYear: YearOverYearAnalysis,
  bidderDistribution: BidderDistributionAnalysis,
}

export default function Dashboard() {
  const { sidebarOpen, closeSidebar } = useOutletContext()
  const [activeTopNav, setActiveTopNav] = useState('descriptive')
  const [activeGroup, setActiveGroup] = useState('tenderAnalysis')
  const [activeMetric, setActiveMetric] = useState('numberWise')
  const defaultFy = getDefaultRollingFyRange(6)
  const [fyFrom, setFyFrom] = useState(defaultFy.fyFrom)
  const [fyTo, setFyTo] = useState(defaultFy.fyTo)
  const [yearRange, setYearRange] = useState(YEAR_RANGE_OPTIONS[YEAR_RANGE_OPTIONS.length - 1] || '2025–2026')

  // Monthly Report (MSR Report) filter state — controlled by
  // DashboardSidebar's 'monthly' branch, consumed by MsrReport.
  const [msrYear, setMsrYear] = useState('2026-27')
  const [msrMonth, setMsrMonth] = useState('June')

  const { apiFetch } = useApi()
  const [overviewStats, setOverviewStats] = useState(DEFAULT_OVERVIEW_STATS)
  const [statsLoading, setStatsLoading] = useState(false)

  // Fetch real-time portal overview stats
  useEffect(() => {
    let isMounted = true
    async function fetchStats() {
      try {
        setStatsLoading(true)
        const res = await apiFetch('/dashboard/overview-stats')
        if (isMounted && res?.success && Array.isArray(res.stats)) {
          setOverviewStats(res.stats)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard overview stats:', err)
      } finally {
        if (isMounted) setStatsLoading(false)
      }
    }
    fetchStats()
    return () => {
      isMounted = false
    }
  }, [apiFetch])

  function handleTopNavChange(id) {
    setActiveTopNav(id)
    const defaults = TOP_NAV_DEFAULTS[id]
    if (defaults) {
      setActiveGroup(defaults.group)
      setActiveMetric(defaults.metric)
    }
  }

  function handleGroupChange(groupId) {
    setActiveGroup(groupId)
    setActiveMetric((prev) => {
      const metrics = GROUP_METRIC_COMPONENTS[groupId]
      if (!metrics) return null
      return metrics[prev] ? prev : Object.keys(metrics)[0]
    })
  }

  function handleMetricChange(groupId, metricId) {
    setActiveGroup(groupId)
    setActiveMetric(metricId)
  }

  // 'monthly' has no group/metric structure, so it's resolved directly
  // rather than through GROUP_METRIC_COMPONENTS/GROUP_COMPONENTS.
  const ActiveMetricComponent =
    activeTopNav === 'monthly'
      ? MsrReport
      : BUILT_TOP_NAV.includes(activeTopNav)
        ? (GROUP_METRIC_COMPONENTS[activeGroup]?.[activeMetric] || GROUP_COMPONENTS[activeGroup])
        : null

  function getComingSoonTitle() {
    if (!BUILT_TOP_NAV.includes(activeTopNav)) {
      return TOP_NAV_ITEMS.find((t) => t.id === activeTopNav)?.label || 'This section'
    }
    const groupsList =
      activeTopNav === 'kpi' ? KPI_GROUPS :
      activeTopNav === 'distribution' ? DISTRIBUTION_GROUPS :
      DESCRIPTIVE_GROUPS
    const group = groupsList.find((g) => g.id === activeGroup)
    if (group?.metrics) {
      const metric = group.metrics.find((m) => m.id === activeMetric)
      return `${group.label} — ${metric?.label || 'this view'}`
    }
    return group?.label || 'This section'
  }

  return (
    <div className="h-full flex overflow-hidden bg-tn-cream">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        activeTopNav={activeTopNav}
        activeGroup={activeGroup}
        onGroupChange={handleGroupChange}
        activeMetric={activeMetric}
        onMetricChange={handleMetricChange}
        financialYears={FINANCIAL_YEARS}
        fyFrom={fyFrom}
        fyTo={fyTo}
        onFyFromChange={setFyFrom}
        onFyToChange={setFyTo}
        yearRangeOptions={YEAR_RANGE_OPTIONS}
        yearRange={yearRange}
        onYearRangeChange={(val) => {
          setYearRange(val)
          if (val) {
            const parts = val.split(/[–-]/)
            const yr = parseInt(parts[parts.length - 1], 10)
            if (yr) {
              setFyTo(`${yr}-${String((yr + 1) % 100).padStart(2, '0')}`)
            }
          }
        }}
        msrMonths={MSR_MONTHS}
        msrYear={msrYear}
        onMsrYearChange={setMsrYear}
        msrMonth={msrMonth}
        onMsrMonthChange={setMsrMonth}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav
          activeTopNav={activeTopNav}
          onChange={handleTopNavChange}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-display font-bold text-tn-navy">Government of Tamil Nadu</h1>
            <p className="text-sm text-tn-muted mt-0.5">E-procurement analytics &amp; reporting dashboard.</p>
          </div>

          {/* Overview stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {overviewStats.map((stat) => (
              <StatCard key={stat.label} {...stat} loading={statsLoading} />
            ))}
          </div>

          {ActiveMetricComponent ? (
            <ActiveMetricComponent
              fyFrom={fyFrom}
              fyTo={fyTo}
              yearRange={yearRange}
              msrYear={msrYear}
              msrMonth={msrMonth}
            />
          ) : (
            <ComingSoonPanel title={getComingSoonTitle()} />
          )}
        </main>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────
// Colour grading here intentionally mirrors the "Preview as" RoleSwitcher
// bar (cream background, rounded pill buttons, coral/salmon inactive state,
// bold white-on-navy-bordered active state). RoleSwitcher.jsx isn't in
// hand, so the inactive pill color is approximated with Tailwind's
// rose/red swatches — swap in the exact custom class (e.g. text-tn-coral)
// if the project already defines one, so it matches pixel-for-pixel.
function TopNav({ activeTopNav, onChange }) {
  return (
    <header className="bg-tn-cream border-b border-tn-border flex-shrink-0">
      <div className="flex items-center px-4 md:px-6 py-3 gap-3">
        <nav className="hidden md:flex items-center gap-2 overflow-x-auto">
          {TOP_NAV_ITEMS.map((item) => {
            const isActive = activeTopNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={[
                  'px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap border',
                  isActive
                    ? 'bg-white border-tn-navy/30 text-tn-navy shadow-sm'
                    : 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100/70',
                ].join(' ')}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Mobile section switcher */}
      <div className="md:hidden px-4 pb-3">
        <select
          value={activeTopNav}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-tn-border rounded-lg px-3 py-2 text-sm text-tn-navy focus:outline-none focus:ring-1 focus:ring-tn-blue/40"
        >
          {TOP_NAV_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>
    </header>
  )
}

function StatCard({ label, value, sub, icon, tone, loading }) {
  const toneMap = {
    blue: 'bg-tn-blue', navy: 'bg-tn-navy', emerald: 'bg-emerald-500',
    amber: 'bg-amber-500', red: 'bg-red-500', slate: 'bg-slate-500',
  }
  const displayVal = loading ? '...' : value
  const len = String(displayVal || '').length

  // Dynamically scale text size using clamp, whitespace-nowrap, and tracking-tight
  const valueSizeClass =
    len > 22 ? 'text-[clamp(0.60rem,1.1vw,0.70rem)]' :
    len > 18 ? 'text-[clamp(0.68rem,1.3vw,0.78rem)]' :
    len > 14 ? 'text-[clamp(0.78rem,1.5vw,0.90rem)]' :
    len > 10 ? 'text-[clamp(0.92rem,1.8vw,1.05rem)]' :
    len > 7  ? 'text-[clamp(1.05rem,2.0vw,1.18rem)]' :
    'text-[clamp(1.15rem,2.2vw,1.25rem)]'

  return (
    <div className={`rounded-2xl ${toneMap[tone] || 'bg-tn-blue'} text-white p-3.5 sm:p-4 shadow-sm flex flex-col justify-between min-h-[92px] overflow-hidden`}>
      <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
        <p
          className={`font-bold leading-none whitespace-nowrap tracking-tight ${valueSizeClass}`}
          title={value}
        >
          {displayVal}
        </p>
        <Icon name={icon} className="w-5 h-5 text-white/70 flex-shrink-0 ml-1" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-white/80 font-medium leading-snug truncate">{label}</p>
        {sub && <p className="text-[10px] text-white/60 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function ComingSoonPanel({ title }) {
  return (
    <div className="bg-white rounded-2xl border border-tn-border p-10 flex flex-col items-center justify-center text-center gap-2">
      <div className="w-12 h-12 rounded-xl bg-tn-light flex items-center justify-center mb-1">
        <Icon name="warning" className="w-6 h-6 text-tn-blue" />
      </div>
      <p className="font-bold text-tn-navy text-sm">{title}</p>
      <p className="text-xs text-tn-muted max-w-sm">
        This view is under development and will be available in a future update.
      </p>
    </div>
  )
}