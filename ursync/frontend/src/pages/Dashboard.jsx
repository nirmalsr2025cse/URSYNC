// src/pages/Dashboard.jsx
//
// Dashboard module. The persistent app Navbar ("Tamil Nadu Government")
// stays visible above this page — Layout.jsx only skips the "Preview as"
// RoleSwitcher bar and the existing Sidebar for the /dashboard route, since
// this page has its own top nav + DashboardSidebar instead. This page fills
// the remaining height under the Navbar (h-full, not h-screen).
//
// Each Tender Analysis metric is its own component (one page = one
// component): NumberWiseAnalysis.jsx and ValueWiseAnalysis.jsx live in
// ./dashboard/ and this file just picks which one to render based on the
// sidebar's activeMetric — add the next metric's component the same way.
//
// Only "Descriptive Analysis → Tender Analysis" (Number Wise + Value Wise)
// is wired up with real (mock) data per the current task. Every other
// sidebar/top-nav entry is visible and clickable but renders a "coming
// soon" panel — intentional, so the structure is ready for the rest later.
import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import DashboardSidebar, { DESCRIPTIVE_GROUPS } from '../components/DashboardSidebar'
import Icon from '../components/Icon'
import NumberWiseAnalysis from './dashboard/NumberWiseAnalysis'
import ValueWiseAnalysis from './dashboard/ValueWiseAnalysis'
import NumberValueWiseAnalysis from './dashboard/NumberValueWiseAnalysis'
import PercentageWiseAnalysis from './dashboard/PercentageWiseAnalysis'
import BidsAwardedAnalysis from './dashboard/BidsAwardedAnalysis'
import BidderWiseAnalysis from './dashboard/BidderWiseAnalysis'
import { FINANCIAL_YEARS, YEAR_RANGE_OPTIONS, OVERVIEW_STATS } from '../data/dashboardMockData'

const TOP_NAV_ITEMS = [
  { id: 'descriptive', label: 'Descriptive Analysis' },
  { id: 'distribution', label: 'Distribution Analysis' },
  { id: 'kpi', label: 'Key Performance Indicators' },
  { id: 'monthly', label: 'Monthly Report' },
]

// Maps a Tender Analysis metric id to the component that renders it.
// Metrics not listed here (valueWise's siblings, other groups) fall back
// to the ComingSoonPanel.
const TENDER_ANALYSIS_METRIC_COMPONENTS = {
  numberWise: NumberWiseAnalysis,
  valueWise: ValueWiseAnalysis,
  numberValueWise: NumberValueWiseAnalysis,
  percentageWise: PercentageWiseAnalysis,
  bidsAwarded: BidsAwardedAnalysis,
}

// Groups with no sidebar sub-metrics (just the FY filter) render straight
// off activeGroup instead of going through TENDER_ANALYSIS_METRIC_COMPONENTS.
const GROUP_COMPONENTS = {
  bidderAnalysis: BidderWiseAnalysis,
}

export default function Dashboard() {
  const { sidebarOpen, closeSidebar } = useOutletContext()
  const [activeTopNav, setActiveTopNav] = useState('descriptive')
  const [activeGroup, setActiveGroup] = useState('tenderAnalysis')
  const [activeMetric, setActiveMetric] = useState('numberWise')
  const [fyFrom, setFyFrom] = useState('2021-22')
  const [fyTo, setFyTo] = useState('2026-27')
  const [yearRange, setYearRange] = useState(YEAR_RANGE_OPTIONS[0])

  function handleTopNavChange(id) {
    setActiveTopNav(id)
  }

  function handleGroupChange(groupId) {
    setActiveGroup(groupId)
    setActiveMetric((prev) => (groupId === 'tenderAnalysis' ? prev || 'numberWise' : null))
  }

  function handleMetricChange(groupId, metricId) {
    setActiveGroup(groupId)
    setActiveMetric(metricId)
  }

  const ActiveMetricComponent =
    activeTopNav === 'descriptive'
      ? (activeGroup === 'tenderAnalysis'
          ? TENDER_ANALYSIS_METRIC_COMPONENTS[activeMetric]
          : GROUP_COMPONENTS[activeGroup])
      : null

  function getComingSoonTitle() {
    if (activeTopNav !== 'descriptive') {
      return TOP_NAV_ITEMS.find((t) => t.id === activeTopNav)?.label || 'This section'
    }
    const group = DESCRIPTIVE_GROUPS.find((g) => g.id === activeGroup)
    if (activeGroup === 'tenderAnalysis') {
      const metric = group?.metrics?.find((m) => m.id === activeMetric)
      return `Tender Analysis — ${metric?.label || 'this view'}`
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
        onYearRangeChange={setYearRange}
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
            {OVERVIEW_STATS.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          {ActiveMetricComponent ? (
            <ActiveMetricComponent fyFrom={fyFrom} fyTo={fyTo} />
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

function StatCard({ label, value, sub, icon, tone }) {
  const toneMap = {
    blue: 'bg-tn-blue', navy: 'bg-tn-navy', emerald: 'bg-emerald-500',
    amber: 'bg-amber-500', red: 'bg-red-500', slate: 'bg-slate-500',
  }
  return (
    <div className={`rounded-2xl ${toneMap[tone] || 'bg-tn-blue'} text-white p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-lg sm:text-xl font-bold leading-tight truncate" title={value}>{value}</p>
        <Icon name={icon} className="w-5 h-5 text-white/70 flex-shrink-0" />
      </div>
      <p className="text-[11px] text-white/80 font-medium leading-snug">{label}</p>
      {sub && <p className="text-[10px] text-white/60 mt-0.5">{sub}</p>}
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