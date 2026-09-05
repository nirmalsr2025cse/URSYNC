// src/pages/dashboard/KpiTenderPublishedAnalysis.jsx
// Key Performance Indicators → Analysis on → Tender Published.
// Five sub-tabs: avg. no. of days between "Tender Published" and downstream milestones.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

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

const SERIES_COLORS = { Open: '#9575CD', Limited: '#C2185B', Others: '#303F9F' }

export default function KpiTenderPublishedAnalysis({ fyFrom, fyTo }) {
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('docDownload')
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
        const res = await apiFetch(`/dashboard/kpi-analysis?section=tenderPublished&subTab=${activeSubTab}&fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setRows(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch KPI tender published data:', err)
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

        {loading ? (
          <div className="flex items-center justify-center h-[420px] text-tn-muted text-sm">
            <div className="w-6 h-6 border-2 border-tn-blue border-t-transparent rounded-full animate-spin mr-2" />
            Loading KPI data…
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}