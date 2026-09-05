// src/pages/dashboard/NumberValueWiseAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Number / Value Wise.
// Renders both count chart and value in Crores chart stacked in one card.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba } from '../../utils/dashboardChartUtils'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

const SUB_TABS = [
  { id: 'tendersPublished', tag: 'TR9', label: 'Tenders - by No./Value' },
  { id: 'categoryWise', tag: 'TR10', label: 'Tender Category - by No./Value' },
  { id: 'typeWise', tag: 'TR11', label: 'Tender Type - by No./Value' },
  { id: 'stageWise', tag: 'TR12', label: 'Tender Status - by No./Value' },
]

const CHART_TITLES = {
  tendersPublished: 'Number/Value of Tenders Published',
  categoryWise: 'Tender Category - Number/Value Wise',
  typeWise: 'Tender Type - Number/Value Wise',
  stageWise: 'Tender Status - Number/Value Wise',
}

const NUMBER_Y_LABEL = 'No of Tenders'
const VALUE_Y_LABEL = 'Value of Tenders (Rs. in Crores)'

function buildChartConfig(subTab, rows, keyField, palette, yAxisLabel) {
  if (subTab === 'tendersPublished') {
    return {
      labels: rows.map((r) => r.fy),
      stacked: false,
      yAxisLabel,
      datasets: [{
        label: yAxisLabel === NUMBER_Y_LABEL ? 'Tenders Published' : 'Value of Tenders',
        data: rows.map((r) => r[keyField] || 0),
        backgroundColor: toRgba(palette[0], 0.85),
        borderRadius: 4,
        maxBarThickness: 40,
      }],
    }
  }
  if (subTab === 'categoryWise') {
    const keys = ['Works', 'Goods', 'Services', 'Consultancy']
    return {
      labels: rows.map((r) => r.fy),
      stacked: true,
      yAxisLabel,
      datasets: keys.map((k, i) => ({
        label: k,
        data: rows.map((r) => r[k] || 0),
        backgroundColor: toRgba(palette[i], 0.85),
        borderRadius: 3,
      })),
    }
  }
  if (subTab === 'typeWise') {
    const keys = ['Open Tender', 'Limited Tender', 'Single Tender', 'EOI']
    return {
      labels: rows.map((r) => r.fy),
      stacked: true,
      yAxisLabel,
      datasets: keys.map((k, i) => ({
        label: k,
        data: rows.map((r) => r[k] || 0),
        backgroundColor: toRgba(palette[i], 0.85),
        borderRadius: 3,
      })),
    }
  }
  // stageWise ("Tender Status") — grouped, not stacked
  const keys = ['Published', 'Bid Submission', 'Technical Evaluation', 'Financial Evaluation', 'Awarded']
  return {
    labels: rows.map((r) => r.fy),
    stacked: false,
    yAxisLabel,
    datasets: keys.map((k, i) => ({
      label: k,
      data: rows.map((r) => r[k] || 0),
      backgroundColor: toRgba(palette[i % palette.length], 0.85),
      borderRadius: 3,
    })),
  }
}

export default function NumberValueWiseAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('tendersPublished')
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState({
    numberData: {
      tendersPublished: [],
      categoryWise: [],
      typeWise: [],
      stageWise: [],
    },
    valueData: {
      tendersPublished: [],
      categoryWise: [],
      typeWise: [],
      stageWise: [],
    },
  })

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const defaultFy = getDefaultRollingFyRange(6)
        const from = fyFrom || defaultFy.fyFrom
        const to = fyTo || defaultFy.fyTo
        const res = await apiFetch(`/dashboard/number-value-wise?fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && res.data) {
          setAnalysisData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch number-value-wise analysis data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, fyFrom, fyTo])

  const numberRows = useMemo(() => {
    const num = analysisData.numberData || {}
    return num[activeSubTab] || []
  }, [activeSubTab, analysisData])

  const valueRows = useMemo(() => {
    const val = analysisData.valueData || {}
    return val[activeSubTab] || []
  }, [activeSubTab, analysisData])

  const numberChart = useMemo(() => {
    const palette =
      activeSubTab === 'categoryWise' ? [colors.blue, colors.navy, colors.emerald, colors.amber] :
      activeSubTab === 'typeWise' ? [colors.blue, colors.emerald, colors.amber, colors.red] :
      activeSubTab === 'stageWise' ? [colors.navy, colors.blue, colors.amber, colors.emerald, colors.red] :
      [colors.blue]
    return buildChartConfig(activeSubTab, numberRows, 'count', palette, NUMBER_Y_LABEL)
  }, [activeSubTab, numberRows, colors])

  const valueChart = useMemo(() => {
    const palette =
      activeSubTab === 'categoryWise' ? [colors.emerald, colors.navy, colors.blue, colors.amber] :
      activeSubTab === 'typeWise' ? [colors.emerald, colors.blue, colors.amber, colors.red] :
      activeSubTab === 'stageWise' ? [colors.navy, colors.emerald, colors.amber, colors.blue, colors.red] :
      [colors.emerald]
    return buildChartConfig(activeSubTab, valueRows, 'value', palette, VALUE_Y_LABEL)
  }, [activeSubTab, valueRows, colors])

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
          labels={numberChart.labels}
          datasets={numberChart.datasets}
          stacked={numberChart.stacked}
          yAxisLabel={numberChart.yAxisLabel}
          richTooltip={{ titlePrefix: 'For the Fin Year', leftHeader: 'Series', rightHeader: 'Number' }}
        />

        <div className="border-t border-tn-border my-5" />

        <BarChartCanvas
          labels={valueChart.labels}
          datasets={valueChart.datasets}
          stacked={valueChart.stacked}
          yAxisLabel={valueChart.yAxisLabel}
          richTooltip={{ titlePrefix: 'For the Fin Year', leftHeader: 'Series', rightHeader: 'Value (Rs. in Crores)' }}
        />
      </div>
    </div>
  )
}