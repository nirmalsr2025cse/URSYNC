// src/pages/dashboard/KpiTechAndFinAnalysis.jsx
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { sliceByFyRange } from '../../utils/dashboardChartUtils'
import {
  KPI_TECH_OPEN_EVAL,
  KPI_TECH_EVAL_FIN_OPEN,
  KPI_FIN_OPEN_FIN_EVAL,
  KPI_TECH_OPEN_FIN_OPEN,
} from '../../data/dashboardMockData'

const SUB_TABS = [
  { id: 'techOpenEval', tag: 'K7', label: 'Tech. Opening And Evaluation' },
  { id: 'techEvalFinOpen', tag: 'K8', label: 'Tech. Evaluation to Fin. opening' },
  { id: 'finOpenFinEval', tag: 'K9', label: 'Fin. Opening to Fin. Evaluation' },
  { id: 'techOpenFinOpen', tag: 'K10', label: 'Tech.Opening to Fin. Opening' },
]

const CHART_TITLES = {
  techOpenEval: 'Avg.Days taken From Technical Opening to Technical Evaluation',
  techEvalFinOpen: 'Avg.Days taken From Technical Evaluation to Financial Opening',
  finOpenFinEval: 'Avg.Days taken From Financial Opening to Financial Evaluation',
  techOpenFinOpen: 'Avg.Days taken From Technical Opening to Financial Opening in 2 Packet System',
}

const DATA_BY_TAB = {
  techOpenEval: KPI_TECH_OPEN_EVAL,
  techEvalFinOpen: KPI_TECH_EVAL_FIN_OPEN,
  finOpenFinEval: KPI_FIN_OPEN_FIN_EVAL,
  techOpenFinOpen: KPI_TECH_OPEN_FIN_OPEN,
}

// Fixed series colors, independent of the app theme — these match the
// legacy dashboard's Limited/Open/Others bar coloring exactly, so this
// chart doesn't shift color when the theme palette changes.
const SERIES_COLORS = { Limited: '#C2185B', Open: '#9575CD', Others: '#303F9F' }

export default function KpiTechAndFinAnalysis({ fyFrom, fyTo }) {
  const [activeSubTab, setActiveSubTab] = useState('techOpenEval') // K10 default, matches screenshot

  const filtered = useMemo(
    () => sliceByFyRange(DATA_BY_TAB[activeSubTab], fyFrom, fyTo),
    [activeSubTab, fyFrom, fyTo]
  )

  const chartConfig = useMemo(() => {
    const keys = ['Limited', 'Open', 'Others']
    return {
      labels: filtered.map((r) => r.fy),
      stacked: false,
      yAxisLabel: 'No. of Days',
      datasets: keys.map((k) => ({
        label: k,
        data: filtered.map((r) => r[k]),
        backgroundColor: SERIES_COLORS[k],
        borderRadius: 3,
      })),
    }
  }, [filtered])

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Key Performance Indicators in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5">
            <Icon name="doc" className="w-4 h-4 text-tn-blue" />
            {activeTab?.tag}. {CHART_TITLES[activeSubTab]}
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
          richTooltip={{ titlePrefix: 'For the Fin Year', leftHeader: 'Series', rightHeader: 'No. of Days' }}
        />
      </div>
    </div>
  )
}