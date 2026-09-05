// src/pages/dashboard/BidderWiseAnalysis.jsx
// Descriptive Analysis → Bidder Analysis.
// Renders MSME vs Non-MSME Bidders live statistics grouped by Financial Year.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba } from '../../utils/dashboardChartUtils'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

const SUB_TABS = [{ id: 'msme', tag: 'BI1', label: 'MSME vs Non MSME Bidders' }]

export default function BidderWiseAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const { apiFetch } = useApi()
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState([])

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const defaultFy = getDefaultRollingFyRange(6)
        const from = fyFrom || defaultFy.fyFrom
        const to = fyTo || defaultFy.fyTo
        const res = await apiFetch(`/dashboard/bidder-wise?fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setAnalysisData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch bidder analysis data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, fyFrom, fyTo])

  const chartConfig = useMemo(() => {
    const msmeColor = '#EC4899' // pink
    const rows = analysisData || []
    return {
      labels: rows.map((r) => r.fy),
      stacked: false,
      yAxisLabel: 'No.of Bidders',
      datasets: [
        {
          label: 'MSME Bidders',
          data: rows.map((r) => r.msme || 0),
          backgroundColor: toRgba(msmeColor, 0.9),
          borderRadius: 3,
        },
        {
          label: 'Non_MSME Bidders',
          data: rows.map((r) => r.nonMsme || 0),
          backgroundColor: toRgba(colors.emerald, 0.85),
          borderRadius: 3,
        },
        {
          label: 'Total Registered Bidders',
          data: rows.map((r) => r.total || 0),
          backgroundColor: toRgba(colors.blue, 0.85),
          borderRadius: 3,
        },
      ],
    }
  }, [analysisData, colors])

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Bidder Wise Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab="msme" onChange={() => {}} />

      <div className="bg-white rounded-2xl border border-tn-border p-5 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <span className="text-xs text-tn-muted font-medium animate-pulse">Loading bidder data...</span>
          </div>
        )}
        <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5 mb-4">
          <Icon name="doc" className="w-4 h-4 text-tn-blue" />
          BI1. No. of MSME Bidders vs. Non-MSME Bidders - Year Wise
        </h3>

        <BarChartCanvas
          labels={chartConfig.labels}
          datasets={chartConfig.datasets}
          stacked={chartConfig.stacked}
          yAxisLabel={chartConfig.yAxisLabel}
          richTooltip={{ titlePrefix: 'For the Fin Year', leftHeader: 'Bidder', rightHeader: 'Number' }}
        />

        <p className="text-xs font-semibold text-tn-navy mt-3">
          <Icon name="drill" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 text-tn-blue" />
          Drill down is available
        </p>
      </div>
    </div>
  )
}