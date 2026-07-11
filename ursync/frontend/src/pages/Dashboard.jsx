// src/pages/Dashboard.jsx
//
// Standalone Dashboard module. This page manages its own full-page chrome
// (top nav + DashboardSidebar) instead of the app's existing Navbar/Sidebar,
// so route it OUTSIDE the authenticated <Layout> wrapper — e.g. as a
// sibling top-level route:
//   <Route path="/dashboard" element={<Dashboard />} />
// rather than nested under the <Layout><Outlet /></Layout> tree — otherwise
// you'll get the existing Navbar/Sidebar/RoleSwitcher stacked above this
// page's own top nav.
//
// Only "Descriptive Analysis → Tender Analysis → Number Wise" is wired up
// with real (mock) data per the current task. Every other sidebar/top-nav
// entry is visible and clickable but renders a "coming soon" panel —
// intentional, so the structure is ready for the remaining pages later.
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardSidebar, { DESCRIPTIVE_GROUPS } from '../components/DashboardSidebar'
import {
  FINANCIAL_YEARS,
  YEAR_RANGE_OPTIONS,
  OVERVIEW_STATS,
  TENDERS_PUBLISHED_BY_FY,
  TENDERS_CATEGORY_WISE,
  TENDERS_TYPE_WISE,
  TENDERS_STAGE_WISE,
} from '../data/dashboardMockData'
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

// ── Helpers ──────────────────────────────────────────────────────────────
// Reads the project's actual Tailwind colors at runtime (via a hidden
// probe element) so the charts stay in sync with the real tn-* palette
// instead of guessing hex values that could drift from tailwind.config.js.
function useThemeColors() {
  const [colors, setColors] = useState({
    blue: '#1D6FA5', navy: '#0A2240', muted: '#6B7A8D',
    emerald: '#10B981', amber: '#F59E0B', red: '#EF4444',
  })

  useEffect(() => {
    const probe = document.createElement('span')
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    probe.style.pointerEvents = 'none'
    document.body.appendChild(probe)

    const read = (cls, fallback) => {
      probe.className = cls
      const val = getComputedStyle(probe).color
      return val && val !== 'rgba(0, 0, 0, 0)' ? val : fallback
    }

    setColors((prev) => ({
      blue: read('text-tn-blue', prev.blue),
      navy: read('text-tn-navy', prev.navy),
      muted: read('text-tn-muted', prev.muted),
      emerald: read('text-emerald-500', prev.emerald),
      amber: read('text-amber-500', prev.amber),
      red: read('text-red-500', prev.red),
    }))

    document.body.removeChild(probe)
  }, [])

  return colors
}

function toRgba(rgbString, alpha) {
  const nums = rgbString.match(/\d+(\.\d+)?/g)
  if (!nums) return rgbString
  const [r, g, b] = nums
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function sliceByFyRange(rows, fyFrom, fyTo) {
  const fromIdx = FINANCIAL_YEARS.indexOf(fyFrom)
  const toIdx = FINANCIAL_YEARS.indexOf(fyTo)
  const [lo, hi] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
  return rows.filter((r) => {
    const idx = FINANCIAL_YEARS.indexOf(r.fy)
    return idx >= lo && idx <= hi
  })
}

// ── Chart.js canvas wrapper (used for every chart on this page) ─────────────
function BarChartCanvas({ labels, datasets, stacked = false, yAxisLabel = '', height = 320 }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 11 }, color: '#4B5A6B' },
          },
          tooltip: {
            backgroundColor: '#0A2240',
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          x: {
            stacked,
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#6B7A8D' },
          },
          y: {
            stacked,
            beginAtZero: true,
            grid: { color: '#EEF1F5' },
            ticks: {
              font: { size: 11 },
              color: '#6B7A8D',
              callback: (v) => Number(v).toLocaleString('en-IN'),
            },
            title: yAxisLabel
              ? { display: true, text: yAxisLabel, font: { size: 11, weight: '600' }, color: '#4B5A6B' }
              : undefined,
          },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [labels, datasets, stacked, yAxisLabel])

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// ── Small icon set used only within this page ───────────────────────────
function Icon({ name, className }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }
  const paths = {
    doc:       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />,
    rupee:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 5h10M7 9h10M9 5c3 0 5 1.5 5 4s-2 4-5 4H7l8 6"/>,
    inbox:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12h4l2 3h4l2-3h4M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M4 12l2-7h12l2 7" />,
    building:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    users:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    usercheck: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 11a4 4 0 100-8 4 4 0 000 8zM2 21v-2a4 4 0 014-4h3.5M14.5 15.5l2.5 2.5 5-5" />,
    warning:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />,
    drill:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    menu:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />,
  }
  return <svg {...props}>{paths[name] || paths.doc}</svg>
}

const TOP_NAV_ITEMS = [
  { id: 'descriptive', label: 'Descriptive Analysis' },
  { id: 'distribution', label: 'Distribution Analysis' },
  { id: 'kpi', label: 'Key Performance Indicators' },
  { id: 'monthly', label: 'Monthly Report' },
]

const SUB_TABS = [
  { id: 'tendersPublished', tag: 'TR1', label: 'Tenders Published' },
  { id: 'categoryWise', tag: 'TR2', label: 'Tenders Category Wise' },
  { id: 'typeWise', tag: 'TR3', label: 'Tenders Type Wise' },
  { id: 'stageWise', tag: 'TR4', label: 'Tenders Stage Wise' },
]

const CHART_TITLES = {
  tendersPublished: 'Number of Tenders Published',
  categoryWise: 'Tenders Category Wise',
  typeWise: 'Tenders Type Wise',
  stageWise: 'Tenders Stage Wise',
}

export default function Dashboard() {
  const colors = useThemeColors()

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activeTopNav, setActiveTopNav] = useState('descriptive')
  const [activeGroup, setActiveGroup] = useState('tenderAnalysis')
  const [activeMetric, setActiveMetric] = useState('numberWise')
  const [activeSubTab, setActiveSubTab] = useState('tendersPublished')
  const [fyFrom, setFyFrom] = useState('2021-22')
  const [fyTo, setFyTo] = useState('2026-27')
  const [yearRange, setYearRange] = useState(YEAR_RANGE_OPTIONS[0])

  function handleTopNavChange(id) {
    setActiveTopNav(id)
    setMobileSidebarOpen(false)
  }

  function handleGroupChange(groupId) {
    setActiveGroup(groupId)
    setActiveMetric((prev) => (groupId === 'tenderAnalysis' ? prev || 'numberWise' : null))
  }

  function handleMetricChange(groupId, metricId) {
    setActiveGroup(groupId)
    setActiveMetric(metricId)
  }

  const showTenderAnalysisNumberWise =
    activeTopNav === 'descriptive' && activeGroup === 'tenderAnalysis' && activeMetric === 'numberWise'

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

  const filteredPublished = useMemo(() => sliceByFyRange(TENDERS_PUBLISHED_BY_FY, fyFrom, fyTo), [fyFrom, fyTo])
  const filteredCategory = useMemo(() => sliceByFyRange(TENDERS_CATEGORY_WISE, fyFrom, fyTo), [fyFrom, fyTo])
  const filteredType = useMemo(() => sliceByFyRange(TENDERS_TYPE_WISE, fyFrom, fyTo), [fyFrom, fyTo])
  const filteredStage = useMemo(() => sliceByFyRange(TENDERS_STAGE_WISE, fyFrom, fyTo), [fyFrom, fyTo])

  const chartConfig = useMemo(() => {
    if (activeSubTab === 'tendersPublished') {
      return {
        labels: filteredPublished.map((r) => r.fy),
        stacked: false,
        yAxisLabel: 'No. of Tenders',
        datasets: [{
          label: 'Tenders Published',
          data: filteredPublished.map((r) => r.count),
          backgroundColor: toRgba(colors.blue, 0.85),
          borderRadius: 4,
          maxBarThickness: 46,
        }],
      }
    }
    if (activeSubTab === 'categoryWise') {
      const keys = ['Works', 'Goods', 'Services', 'Consultancy']
      const palette = [colors.blue, colors.navy, colors.emerald, colors.amber]
      return {
        labels: filteredCategory.map((r) => r.fy),
        stacked: true,
        yAxisLabel: 'No. of Tenders',
        datasets: keys.map((k, i) => ({
          label: k,
          data: filteredCategory.map((r) => r[k]),
          backgroundColor: toRgba(palette[i], 0.85),
          borderRadius: 3,
        })),
      }
    }
    if (activeSubTab === 'typeWise') {
      const keys = ['Open Tender', 'Limited Tender', 'Single Tender', 'EOI']
      const palette = [colors.blue, colors.emerald, colors.amber, colors.red]
      return {
        labels: filteredType.map((r) => r.fy),
        stacked: true,
        yAxisLabel: 'No. of Tenders',
        datasets: keys.map((k, i) => ({
          label: k,
          data: filteredType.map((r) => r[k]),
          backgroundColor: toRgba(palette[i], 0.85),
          borderRadius: 3,
        })),
      }
    }
    // stageWise — grouped (not stacked): each stage is a count in its own
    // right, not an additive slice of the same total.
    const keys = ['Published', 'Bid Submission', 'Technical Evaluation', 'Financial Evaluation', 'Awarded']
    const palette = [colors.navy, colors.blue, colors.amber, colors.emerald, colors.red]
    return {
      labels: filteredStage.map((r) => r.fy),
      stacked: false,
      yAxisLabel: 'No. of Tenders',
      datasets: keys.map((k, i) => ({
        label: k,
        data: filteredStage.map((r) => r[k]),
        backgroundColor: toRgba(palette[i], 0.85),
        borderRadius: 3,
      })),
    }
  }, [activeSubTab, filteredPublished, filteredCategory, filteredType, filteredStage, colors])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-tn-cream">
      <TopNav
        activeTopNav={activeTopNav}
        onChange={handleTopNavChange}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
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

          {!showTenderAnalysisNumberWise ? (
            <ComingSoonPanel title={getComingSoonTitle()} />
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
                Tender Analysis in Tamil Nadu
              </div>

              <div className="inline-flex flex-wrap items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1">
                {SUB_TABS.map((tab) => {
                  const isActive = activeSubTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id)}
                      className={[
                        'px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
                        isActive
                          ? 'bg-tn-navy text-white shadow-sm'
                          : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
                      ].join(' ')}
                    >
                      # {tab.label}
                    </button>
                  )
                })}
              </div>

              <div className="bg-white rounded-2xl border border-tn-border p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5">
                    <Icon name="doc" className="w-4 h-4 text-tn-blue" />
                    {SUB_TABS.find((t) => t.id === activeSubTab)?.tag}. {CHART_TITLES[activeSubTab]}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] text-tn-muted">
                    <Icon name="drill" className="w-3.5 h-3.5" />
                    Drill down is available
                  </span>
                </div>
                <BarChartCanvas
                  labels={chartConfig.labels}
                  datasets={chartConfig.datasets}
                  stacked={chartConfig.stacked}
                  yAxisLabel={chartConfig.yAxisLabel}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────
function TopNav({ activeTopNav, onChange, onOpenMobileSidebar }) {
  const navigate = useNavigate()
  return (
    <header className="bg-tn-navy text-white flex-shrink-0">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden text-white/80 hover:text-white transition-colors flex-shrink-0"
            aria-label="Open dashboard menu"
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {TOP_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={[
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  activeTopNav === item.id ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Login only — no Select State / state textbox per spec */}
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-tn-blue hover:bg-tn-navy border border-white/10 shadow-sm transition-colors duration-200 flex-shrink-0"
        >
          Login
        </button>
      </div>

      {/* Mobile section switcher */}
      <div className="md:hidden px-4 pb-3">
        <select
          value={activeTopNav}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
        >
          {TOP_NAV_ITEMS.map((item) => (
            <option key={item.id} value={item.id} className="text-tn-navy">{item.label}</option>
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