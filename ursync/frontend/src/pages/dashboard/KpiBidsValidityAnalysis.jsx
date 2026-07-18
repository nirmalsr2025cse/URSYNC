// src/pages/dashboard/KpiBidsValidityAnalysis.jsx
// Key Performance Indicators → Analysis on → Bids Validity period.
// Self-contained: owns its own sub-tab state (K14/K15) and reads the FY
// range from props, same pattern as KpiBidsAwardedAnalysis.jsx. Values are
// percentages, and value labels are shown above each bar (unlike the
// Bids Awarded page), matching the reference dashboard.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { sliceByFyRange } from '../../utils/dashboardChartUtils'
import {
  KPI_AWARDED_WITHIN_VALIDITY,
  KPI_AWARDED_BEYOND_VALIDITY,
} from '../../data/dashboardMockData'

const SUB_TABS = [
  { id: 'withinValidity', tag: 'K14', label: 'Tenders Awarded within Specified Bid Validity Period' },
  { id: 'beyondValidity', tag: 'K15', label: 'Tenders Awarded beyond Bid Validity Period' },
]

const CHART_TITLES = {
  withinValidity: 'Percentage of Tenders Awarded within Specified Bid Validity Period',
  beyondValidity: 'Percentage of Tenders Awarded beyond Bid Validity Period',
}

const DATA_BY_TAB = {
  withinValidity: KPI_AWARDED_WITHIN_VALIDITY,
  beyondValidity: KPI_AWARDED_BEYOND_VALIDITY,
}

// Fixed series colors, independent of the app theme — legend order here is
// Open / Others / Limited, matching the reference dashboard.
const SERIES_COLORS = { Open: '#9575CD', Others: '#303F9F', Limited: '#C2185B' }

// Values are 0-100 percentages, not counts — format them with a trailing
// "%" instead of the default en-IN number grouping.
const formatPercent = (v) => `${v}%`

export default function KpiBidsValidityAnalysis({ fyFrom, fyTo }) {
  const [activeSubTab, setActiveSubTab] = useState('withinValidity') // K14 default, matches screenshot

  const filtered = useMemo(
    () => sliceByFyRange(DATA_BY_TAB[activeSubTab], fyFrom, fyTo),
    [activeSubTab, fyFrom, fyTo]
  )

  const chartConfig = useMemo(() => {
    const keys = ['Open', 'Others', 'Limited']
    return {
      labels: filtered.map((r) => r.fy),
      stacked: false,
      yAxisLabel: 'Percentage of Awarded Tenders',
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
          richTooltip={{ titlePrefix: 'For the Fin Year', leftHeader: 'Series', rightHeader: '% Awarded' }}
        />
      </div>
    </div>
  )
}