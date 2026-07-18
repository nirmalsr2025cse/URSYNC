// src/pages/dashboard/KpiBidsAwardedAnalysis.jsx
// Key Performance Indicators → Analysis on → Bids Awarded.
// Self-contained: owns its own sub-tab state (the 3 K-metrics) and reads
// the FY range from props, same pattern as KpiTechAndFinAnalysis.jsx.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { sliceByFyRange } from '../../utils/dashboardChartUtils'
import {
  KPI_PUBLISH_TO_AWARDED,
  KPI_FIN_OPEN_TO_AWARDED,
  KPI_TECH_OPEN_TO_AWARDED,
} from '../../data/dashboardMockData'

const SUB_TABS = [
  { id: 'publishToAwarded', tag: 'K11', label: 'From Publishing to Bids Awarded' },
  { id: 'finOpenToAwarded', tag: 'K12', label: 'From Financial Opening to Bids Awarded' },
  { id: 'techOpenToAwarded', tag: 'K13', label: 'Technical Opening to Bids Awarded' },
]

const CHART_TITLES = {
  publishToAwarded: 'Avg.Days taken From Publishing to Bids Awarded',
  finOpenToAwarded: 'Avg.Days taken From Financial Opening to Bids Awarded',
  techOpenToAwarded: 'Avg.Days taken From Technical Opening to Bids Awarded',
}

const DATA_BY_TAB = {
  publishToAwarded: KPI_PUBLISH_TO_AWARDED,
  finOpenToAwarded: KPI_FIN_OPEN_TO_AWARDED,
  techOpenToAwarded: KPI_TECH_OPEN_TO_AWARDED,
}

// Fixed series colors, independent of the app theme — legend order here is
// Others / Open / Limited (note: different order than the Tech. and Fin.
// page, which is Limited / Open / Others — matches the reference dashboard).
const SERIES_COLORS = { Others: '#303F9F', Open: '#9575CD', Limited: '#C2185B' }

export default function KpiBidsAwardedAnalysis({ fyFrom, fyTo }) {
  const [activeSubTab, setActiveSubTab] = useState('publishToAwarded') // K11 default, matches screenshot

  const filtered = useMemo(
    () => sliceByFyRange(DATA_BY_TAB[activeSubTab], fyFrom, fyTo),
    [activeSubTab, fyFrom, fyTo]
  )

  const chartConfig = useMemo(() => {
    const keys = ['Others', 'Open', 'Limited']
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