// src/pages/dashboard/NumberWiseAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Number Wise.
// Self-contained: owns its own sub-tab state (Tenders Published / Category
// Wise / Type Wise / Stage Wise) and reads the FY range from props so the
// sidebar's Financial Year Filter can drive it from Dashboard.jsx.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba } from '../../utils/dashboardChartUtils'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

const SUB_TABS = [
  { id: 'tendersPublished', tag: 'TR1', label: '# Tenders Published' },
  { id: 'categoryWise', tag: 'TR2', label: '# Tenders Category Wise' },
  { id: 'typeWise', tag: 'TR3', label: '# Tenders Type Wise' },
  { id: 'stageWise', tag: 'TR4', label: '# Tenders Stage Wise' },
]

const CHART_TITLES = {
  tendersPublished: 'Number of Tenders Published',
  categoryWise: 'Tenders Category Wise',
  typeWise: 'Tenders Type Wise',
  stageWise: 'Tenders Stage Wise',
}

export default function NumberWiseAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('tendersPublished')
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState({
    tendersPublished: [],
    categoryWise: [],
    typeWise: [],
    stageWise: [],
  })

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const defaultFy = getDefaultRollingFyRange(6)
        const from = fyFrom || defaultFy.fyFrom
        const to = fyTo || defaultFy.fyTo
        const res = await apiFetch(`/dashboard/number-wise?fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && res.data) {
          setAnalysisData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch number-wise analysis data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, fyFrom, fyTo])

  const chartConfig = useMemo(() => {
    const published = analysisData.tendersPublished || []
    const category = analysisData.categoryWise || []
    const type = analysisData.typeWise || []
    const stage = analysisData.stageWise || []

    if (activeSubTab === 'tendersPublished') {
      return {
        labels: published.map((r) => r.fy),
        stacked: false,
        yAxisLabel: 'No. of Tenders',
        datasets: [{
          label: 'Tenders Published',
          data: published.map((r) => r.count),
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
        labels: category.map((r) => r.fy),
        stacked: true,
        yAxisLabel: 'No. of Tenders',
        datasets: keys.map((k, i) => ({
          label: k,
          data: category.map((r) => r[k] || 0),
          backgroundColor: toRgba(palette[i], 0.85),
          borderRadius: 3,
        })),
      }
    }
    if (activeSubTab === 'typeWise') {
      const keys = ['Open Tender', 'Limited Tender', 'Single Tender', 'EOI']
      const palette = [colors.blue, colors.emerald, colors.amber, colors.red]
      return {
        labels: type.map((r) => r.fy),
        stacked: true,
        yAxisLabel: 'No. of Tenders',
        datasets: keys.map((k, i) => ({
          label: k,
          data: type.map((r) => r[k] || 0),
          backgroundColor: toRgba(palette[i], 0.85),
          borderRadius: 3,
        })),
      }
    }
    // stageWise — grouped (not stacked)
    const keys = ['Published', 'Bid Submission', 'Technical Evaluation', 'Financial Evaluation', 'Awarded']
    const palette = [colors.navy, colors.blue, colors.amber, colors.emerald, colors.red]
    return {
      labels: stage.map((r) => r.fy),
      stacked: false,
      yAxisLabel: 'No. of Tenders',
      datasets: keys.map((k, i) => ({
        label: k,
        data: stage.map((r) => r[k] || 0),
        backgroundColor: toRgba(palette[i], 0.85),
        borderRadius: 3,
      })),
    }
  }, [activeSubTab, analysisData, colors])

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Tender Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <span className="text-xs text-tn-muted font-medium animate-pulse">Loading analysis data...</span>
          </div>
        )}
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
          richTooltip={{ titlePrefix: 'For the Fin Year', leftHeader: 'Series', rightHeader: 'Number' }}
        />
      </div>
    </div>
  )
}