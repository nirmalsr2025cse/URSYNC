// src/pages/dashboard/ValueWiseAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Value Wise.
// Same shape as NumberWiseAnalysis, but for Rs.-in-Crores figures — green
// bars and a coral active sub-tab pill, matching the reference mock.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba, sliceByFyRange } from '../../utils/dashboardChartUtils'
import {
  TENDERS_VALUE_BY_FY,
  TENDERS_VALUE_CATEGORY_WISE,
  TENDERS_VALUE_TYPE_WISE,
  TENDERS_VALUE_STAGE_WISE,
} from '../../data/dashboardMockData'

const SUB_TABS = [
  { id: 'tendersPublished', tag: 'TR5', label: 'Tenders Published', icon: 'rupee' },
  { id: 'categoryWise', tag: 'TR6', label: 'Tenders Category Wise', icon: 'rupee' },
  { id: 'typeWise', tag: 'TR7', label: 'Tenders Type Wise', icon: 'rupee' },
  { id: 'stageWise', tag: 'TR8', label: 'Tenders Stage Wise', icon: 'rupee' },
]

const CHART_TITLES = {
  tendersPublished: 'Value of Tenders Published',
  categoryWise: 'Tender Value Category Wise',
  typeWise: 'Tender Value Type Wise',
  stageWise: 'Tender Value Stage Wise',
}

const Y_AXIS_LABEL = 'Value of Tenders (Rs. in Crores)'

export default function ValueWiseAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const [activeSubTab, setActiveSubTab] = useState('tendersPublished')

  const filteredPublished = useMemo(() => sliceByFyRange(TENDERS_VALUE_BY_FY, fyFrom, fyTo), [fyFrom, fyTo])
  const filteredCategory = useMemo(() => sliceByFyRange(TENDERS_VALUE_CATEGORY_WISE, fyFrom, fyTo), [fyFrom, fyTo])
  const filteredType = useMemo(() => sliceByFyRange(TENDERS_VALUE_TYPE_WISE, fyFrom, fyTo), [fyFrom, fyTo])
  const filteredStage = useMemo(() => sliceByFyRange(TENDERS_VALUE_STAGE_WISE, fyFrom, fyTo), [fyFrom, fyTo])

  const chartConfig = useMemo(() => {
    if (activeSubTab === 'tendersPublished') {
      return {
        labels: filteredPublished.map((r) => r.fy),
        stacked: false,
        yAxisLabel: Y_AXIS_LABEL,
        datasets: [{
          label: 'Value of Tenders',
          data: filteredPublished.map((r) => r.value),
          backgroundColor: toRgba(colors.emerald, 0.85),
          borderRadius: 4,
          maxBarThickness: 46,
        }],
      }
    }
    if (activeSubTab === 'categoryWise') {
      const keys = ['Works', 'Goods', 'Services', 'Consultancy']
      const palette = [colors.emerald, colors.navy, colors.blue, colors.amber]
      return {
        labels: filteredCategory.map((r) => r.fy),
        stacked: true,
        yAxisLabel: Y_AXIS_LABEL,
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
      const palette = [colors.emerald, colors.blue, colors.amber, colors.red]
      return {
        labels: filteredType.map((r) => r.fy),
        stacked: true,
        yAxisLabel: Y_AXIS_LABEL,
        datasets: keys.map((k, i) => ({
          label: k,
          data: filteredType.map((r) => r[k]),
          backgroundColor: toRgba(palette[i], 0.85),
          borderRadius: 3,
        })),
      }
    }
    // stageWise — grouped (not stacked)
    const keys = ['Published', 'Bid Submission', 'Technical Evaluation', 'Financial Evaluation', 'Awarded']
    const palette = [colors.navy, colors.emerald, colors.amber, colors.blue, colors.red]
    return {
      labels: filteredStage.map((r) => r.fy),
      stacked: false,
      yAxisLabel: Y_AXIS_LABEL,
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
            <Icon name="doc" className="w-4 h-4 text-emerald-600" />
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