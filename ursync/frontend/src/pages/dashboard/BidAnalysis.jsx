// src/pages/dashboard/BidAnalysis.jsx
// Descriptive Analysis → Bid Analysis.
// Renders live bids and tenders data for B1 (All), B2 (Goods), B3 (Services), B4 (Works).
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba } from '../../utils/dashboardChartUtils'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

const SUB_TABS = [
  { id: 'received', tag: 'B1', label: 'Bids Received' },
  { id: 'goods', tag: 'B2', label: 'Bids Received - Goods' },
  { id: 'services', tag: 'B3', label: 'Bids Received - Services' },
  { id: 'works', tag: 'B4', label: 'Bids Received - Works' },
]

const CHART_TITLES = {
  received: 'Number of Bids Received - Fin. Year Wise',
  goods: 'Number of Bids Received (Goods) - Fin. Year Wise',
  services: 'Number of Bids Received (Services) - Fin. Year Wise',
  works: 'Number of Bids Received (Works) - Fin. Year Wise',
}

export default function BidAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('received')
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState({
    received: [],
    goods: [],
    services: [],
    works: [],
  })

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const defaultFy = getDefaultRollingFyRange(6)
        const from = fyFrom || defaultFy.fyFrom
        const to = fyTo || defaultFy.fyTo
        const res = await apiFetch(`/dashboard/bid-analysis?fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && res.data) {
          setAnalysisData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch bid analysis data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, fyFrom, fyTo])

  const filtered = useMemo(() => {
    return analysisData[activeSubTab] || []
  }, [activeSubTab, analysisData])

  const chartConfig = useMemo(() => ({
    labels: filtered.map((r) => r.fy),
    stacked: false,
    yAxisLabel: 'Number',
    datasets: [
      { label: 'No. of Tenders', data: filtered.map((r) => r.tenders || 0), backgroundColor: toRgba(colors.blue, 0.85), borderRadius: 3 },
      { label: 'No of Bids', data: filtered.map((r) => r.bids || 0), backgroundColor: toRgba(colors.amber, 0.85), borderRadius: 3 },
    ],
  }), [filtered, colors])

  // Custom tooltip rows showing # Tenders, Tender Value (Cr), # Bids, and Avg Bids per Tender
  function buildTooltipRows(dataIndex) {
    const row = filtered[dataIndex]
    if (!row) return []

    const value = row.value || 0
    const avgBidsPerTender = row.avgBidsPerTender || (row.tenders ? row.bids / row.tenders : 0)

    return [
      { label: '# Tenders', value: row.tenders || 0, color: colors.blue },
      {
        label: '₹ Tenders (Rs. in Crores)',
        value,
        color: colors.emerald,
        display: value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      { label: '# Bids', value: row.bids || 0, color: colors.amber },
      {
        label: 'Avg Bids per Tender',
        value: avgBidsPerTender,
        color: '#9CC5A1',
        display: Number(avgBidsPerTender).toFixed(2),
      },
    ]
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Bids Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <span className="text-xs text-tn-muted font-medium animate-pulse">Loading bids data...</span>
          </div>
        )}
        <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5 mb-4">
          <Icon name="doc" className="w-4 h-4 text-tn-blue" />
          {SUB_TABS.find((t) => t.id === activeSubTab)?.tag}. {CHART_TITLES[activeSubTab]}
        </h3>

        <BarChartCanvas
          labels={chartConfig.labels}
          datasets={chartConfig.datasets}
          stacked={chartConfig.stacked}
          yAxisLabel={chartConfig.yAxisLabel}
          richTooltip={{
            caption: 'Click on it for further drill down',
            titlePrefix: 'For the Fin Year',
            leftHeader: 'Description',
            rightHeader: 'Number',
            rows: buildTooltipRows,
          }}
        />

        <p className="text-xs font-semibold text-tn-navy mt-3">
          <Icon name="drill" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 text-tn-blue" />
          Drill down is available
        </p>
      </div>
    </div>
  )
}