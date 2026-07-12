// src/pages/dashboard/NumberWiseAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Number Wise.
// Self-contained: owns its own sub-tab state (Tenders Published / Category
// Wise / Type Wise / Stage Wise) and reads the FY range from props so the
// sidebar's Financial Year Filter can drive it from Dashboard.jsx.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba, sliceByFyRange } from '../../utils/dashboardChartUtils'
import {
  TENDERS_PUBLISHED_BY_FY,
  TENDERS_CATEGORY_WISE,
  TENDERS_TYPE_WISE,
  TENDERS_STAGE_WISE,
} from '../../data/dashboardMockData'

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
  const [activeSubTab, setActiveSubTab] = useState('tendersPublished')

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
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Tender Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

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
  )
}