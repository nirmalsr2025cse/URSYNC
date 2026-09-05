// src/pages/dashboard/KpiBidsValidityAnalysis.jsx
// Key Performance Indicators → Analysis on → Bids Validity period.
// Self-contained: owns its own sub-tab state (K14/K15) and reads the FY
// range from props. Values are percentages.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

const SUB_TABS = [
  { id: 'withinValidity', tag: 'K14', label: 'Tenders Awarded within Specified Bid Validity Period' },
  { id: 'beyondValidity', tag: 'K15', label: 'Tenders Awarded beyond Bid Validity Period' },
]

const CHART_TITLES = {
  withinValidity: 'Percentage of Tenders Awarded within Specified Bid Validity Period',
  beyondValidity: 'Percentage of Tenders Awarded beyond Bid Validity Period',
}

// Fixed series colors, independent of the app theme — legend order here is
// Open / Others / Limited, matching the reference dashboard.
const SERIES_COLORS = { Open: '#9575CD', Others: '#303F9F', Limited: '#C2185B' }
const SERIES_KEYS = ['Open', 'Others', 'Limited']

export default function KpiBidsValidityAnalysis({ fyFrom, fyTo }) {
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('withinValidity')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const defaultFy = getDefaultRollingFyRange(6)
  const from = fyFrom || defaultFy.fyFrom
  const to = fyTo || defaultFy.fyTo

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const res = await apiFetch(`/dashboard/kpi-analysis?section=bidsValidityPeriod&subTab=${activeSubTab}&fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setRows(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch KPI bids validity data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, activeSubTab, from, to])

  const chartConfig = useMemo(() => {
    return {
      labels: rows.map((r) => r.fy),
      stacked: false,
      yAxisLabel: 'Percentage of Awarded Tenders',
      datasets: SERIES_KEYS.map((k) => ({
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
    return SERIES_KEYS.map((k) => {
      const val = row[k] ?? 0
      return {
        label: k,
        value: val,
        display: `${val}%`,
        color: SERIES_COLORS[k],
      }
    })
  }

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

        {loading ? (
          <div className="flex items-center justify-center h-[420px] text-tn-muted text-sm">
            <div className="w-6 h-6 border-2 border-tn-blue border-t-transparent rounded-full animate-spin mr-2" />
            Loading KPI data…
          </div>
        ) : (
          <BarChartCanvas
            labels={chartConfig.labels}
            datasets={chartConfig.datasets}
            stacked={chartConfig.stacked}
            yAxisLabel={chartConfig.yAxisLabel}
            height={420}
            richTooltip={{
              titlePrefix: 'For the Fin Year',
              leftHeader: 'Series',
              rightHeader: '% Awarded',
              rows: buildTooltipRows,
            }}
          />
        )}
      </div>
    </div>
  )
}