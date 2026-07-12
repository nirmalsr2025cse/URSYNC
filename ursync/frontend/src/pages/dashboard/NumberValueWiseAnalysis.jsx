// src/pages/dashboard/NumberValueWiseAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Number / Value Wise.
// Same shape as NumberWiseAnalysis / ValueWiseAnalysis, but each sub-tab
// renders BOTH the count chart and the value chart stacked in one card
// (TR9–TR12), reusing the exact same mock data + split ratios as the two
// single-metric pages so all three stay numerically consistent.
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
  TENDERS_VALUE_BY_FY,
  TENDERS_VALUE_CATEGORY_WISE,
  TENDERS_VALUE_TYPE_WISE,
  TENDERS_VALUE_STAGE_WISE,
} from '../../data/dashboardMockData'

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

// Builds one chart config (count or value) for a given sub-tab, sharing the
// same key/palette logic NumberWiseAnalysis and ValueWiseAnalysis each use.
function buildChartConfig(subTab, rows, keyField, palette, yAxisLabel) {
  if (subTab === 'tendersPublished') {
    return {
      labels: rows.map((r) => r.fy),
      stacked: false,
      yAxisLabel,
      datasets: [{
        label: yAxisLabel === NUMBER_Y_LABEL ? 'Tenders Published' : 'Value of Tenders',
        data: rows.map((r) => r[keyField]),
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
        data: rows.map((r) => r[k]),
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
        data: rows.map((r) => r[k]),
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
      data: rows.map((r) => r[k]),
      backgroundColor: toRgba(palette[i % palette.length], 0.85),
      borderRadius: 3,
    })),
  }
}

export default function NumberValueWiseAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const [activeSubTab, setActiveSubTab] = useState('tendersPublished')

  const numberRows = useMemo(() => {
    const source =
      activeSubTab === 'tendersPublished' ? TENDERS_PUBLISHED_BY_FY :
      activeSubTab === 'categoryWise' ? TENDERS_CATEGORY_WISE :
      activeSubTab === 'typeWise' ? TENDERS_TYPE_WISE :
      TENDERS_STAGE_WISE
    return sliceByFyRange(source, fyFrom, fyTo)
  }, [activeSubTab, fyFrom, fyTo])

  const valueRows = useMemo(() => {
    const source =
      activeSubTab === 'tendersPublished' ? TENDERS_VALUE_BY_FY :
      activeSubTab === 'categoryWise' ? TENDERS_VALUE_CATEGORY_WISE :
      activeSubTab === 'typeWise' ? TENDERS_VALUE_TYPE_WISE :
      TENDERS_VALUE_STAGE_WISE
    return sliceByFyRange(source, fyFrom, fyTo)
  }, [activeSubTab, fyFrom, fyTo])

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
          labels={numberChart.labels}
          datasets={numberChart.datasets}
          stacked={numberChart.stacked}
          yAxisLabel={numberChart.yAxisLabel}
        />

        <div className="border-t border-tn-border my-5" />

        <BarChartCanvas
          labels={valueChart.labels}
          datasets={valueChart.datasets}
          stacked={valueChart.stacked}
          yAxisLabel={valueChart.yAxisLabel}
        />
      </div>
    </div>
  )
}