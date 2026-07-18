// src/pages/dashboard/KpiTenderPublishedAnalysis.jsx
// Key Performance Indicators → Analysis on → Tender Published.
// Five sub-tabs, each the same shape: avg. no. of days between "Tender
// Published" and a downstream milestone, split by tender type (Open /
// Limited / Others). K5 (Published to Fin. Evaluation) is the default,
// matching the reference mock.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { sliceByFyRange } from '../../utils/dashboardChartUtils'
import { getKpiTenderPublishedStage } from '../../data/dashboardMockData'

const SUB_TABS = [
  { id: 'docDownload', tag: 'K1', label: 'Published to Doc. Download' },
  { id: 'techOpening', tag: 'K2', label: 'Published to Tech. Opening' },
  { id: 'techEvaluation', tag: 'K3', label: 'Published to Tech. Evaluation' },
  { id: 'finOpening', tag: 'K4', label: 'Published to Fin. Opening' },
  { id: 'finEvaluation', tag: 'K5', label: 'Published to Fin. Evaluation' },
]

const STAGE_TITLE = {
  docDownload: 'Document Download',
  techOpening: 'Technical Opening',
  techEvaluation: 'Technical Evaluation',
  finOpening: 'Financial Opening',
  finEvaluation: 'Financial Evaluation',
}

// Purple / magenta / indigo, matching the reference mock's Open / Limited /
// Others bar colors — distinct from the blue/emerald/amber palette used
// elsewhere so KPI charts read as their own visual family.
//
// Passed straight to Chart.js as backgroundColor (NOT run through
// toRgba()): that helper expects an {r,g,b}-style value (as returned by
// useThemeColors()), and silently produces black when handed a raw hex
// string like '#9575CD' instead — which is why every bar was rendering
// black despite these three colors being distinct.
const SERIES_COLORS = { Open: '#9575CD', Limited: '#C2185B', Others: '#303F9F' }

export default function KpiTenderPublishedAnalysis({ fyFrom, fyTo }) {
  const [activeSubTab, setActiveSubTab] = useState('docDownload')

  const rows = useMemo(
    () => sliceByFyRange(getKpiTenderPublishedStage(activeSubTab), fyFrom, fyTo),
    [activeSubTab, fyFrom, fyTo]
  )

  const chartConfig = useMemo(() => {
    const keys = ['Open', 'Limited', 'Others']
    return {
      labels: rows.map((r) => r.fy),
      datasets: keys.map((k) => ({
        label: k,
        data: rows.map((r) => r[k]),
        backgroundColor: SERIES_COLORS[k],
        borderRadius: 3,
        maxBarThickness: 34,
      })),
    }
  }, [rows])

  function buildTooltipRows(dataIndex) {
    const row = rows[dataIndex]
    if (!row) return []
    return ['Open', 'Limited', 'Others'].map((k) => ({
      label: k,
      value: row[k],
      color: SERIES_COLORS[k],
    }))
  }

  const activeTag = SUB_TABS.find((t) => t.id === activeSubTab)?.tag

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Key Performance Indicators in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5 mb-4">
          <Icon name="barChart" className="w-4 h-4 text-tn-blue" />
          {activeTag} Avg days between Tender Published And {STAGE_TITLE[activeSubTab]}
        </h3>

        <BarChartCanvas
          labels={chartConfig.labels}
          datasets={chartConfig.datasets}
          yAxisLabel="No. of Days"
          height={420}
          richTooltip={{
            titlePrefix: 'For the Fin Year',
            leftHeader: 'Category',
            rightHeader: 'No. of Days',
            rows: buildTooltipRows,
          }}
        />
      </div>
    </div>
  )
}