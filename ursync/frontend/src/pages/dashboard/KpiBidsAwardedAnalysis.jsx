// src/pages/dashboard/KpiBidsAwardedAnalysis.jsx
// Key Performance Indicators → Analysis on → Bids Awarded.
// Self-contained: owns its own sub-tab state (the 3 K-metrics) and reads
// the FY range from props.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

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

// Fixed series colors, independent of the app theme — legend order here is
// Others / Open / Limited (note: different order than the Tech. and Fin.
// page, which is Limited / Open / Others — matches the reference dashboard).
const SERIES_COLORS = { Others: '#303F9F', Open: '#9575CD', Limited: '#C2185B' }
const SERIES_KEYS = ['Others', 'Open', 'Limited']

export default function KpiBidsAwardedAnalysis({ fyFrom, fyTo }) {
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('publishToAwarded')
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
        const res = await apiFetch(`/dashboard/kpi-analysis?section=bidsAwarded&subTab=${activeSubTab}&fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setRows(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch KPI bids awarded data:', err)
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
      yAxisLabel: 'No. of Days',
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
    return SERIES_KEYS.map((k) => ({
      label: k,
      value: row[k],
      color: SERIES_COLORS[k],
    }))
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
              rightHeader: 'No. of Days',
              rows: buildTooltipRows,
            }}
          />
        )}
      </div>
    </div>
  )
}