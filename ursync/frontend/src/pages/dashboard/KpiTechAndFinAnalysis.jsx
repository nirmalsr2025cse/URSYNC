// src/pages/dashboard/KpiTechAndFinAnalysis.jsx
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

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

// Fixed series colors, independent of the app theme — these match the
// legacy dashboard's Limited/Open/Others bar coloring exactly, so this
// chart doesn't shift color when the theme palette changes.
const SERIES_COLORS = { Limited: '#C2185B', Open: '#9575CD', Others: '#303F9F' }
const SERIES_KEYS = ['Limited', 'Open', 'Others']

export default function KpiTechAndFinAnalysis({ fyFrom, fyTo }) {
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('techOpenEval')
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
        const res = await apiFetch(`/dashboard/kpi-analysis?section=techAndFin&subTab=${activeSubTab}&fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setRows(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch KPI tech and fin data:', err)
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