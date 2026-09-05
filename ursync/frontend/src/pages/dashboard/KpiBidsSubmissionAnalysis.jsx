// src/pages/dashboard/KpiBidsSubmissionAnalysis.jsx
// Key Performance Indicators → Analysis on → Bids Submission.
// Single sub-tab (K6): average number of days allowed for bid submission,
// year wise, split by tender type (Limited / Open / Others). Same shape
// as KpiTenderPublishedAnalysis.jsx (grouped bar + rich tooltip over the
// FY range), but with only one tab — TabBar still used (single entry) for
// visual consistency with every other KPI/Distribution page's red pill
// header, per the reference mock.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

// Order and colors intentionally match the reference mock's legend order
// for this specific chart (Limited, Open, Others) — note this is a
// different order from KpiTenderPublishedAnalysis's Open/Limited/Others,
// since the reference mock itself orders them differently per chart.
const SERIES_COLORS = { Limited: '#C2185B', Open: '#9575CD', Others: '#303F9F' }
const SERIES_KEYS = ['Limited', 'Open', 'Others']

const TABS = [{ id: 'allowedYearWise', label: 'Allowed for Bid Submission Year Wise' }]

export default function KpiBidsSubmissionAnalysis({ fyFrom, fyTo }) {
  const { apiFetch } = useApi()
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
        const res = await apiFetch(`/dashboard/kpi-analysis?section=bidsSubmission&subTab=allowedYearWise&fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setRows(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch KPI bids submission data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, from, to])

  const chartConfig = useMemo(() => ({
    labels: rows.map((r) => r.fy),
    datasets: SERIES_KEYS.map((k) => ({
      label: k,
      data: rows.map((r) => r[k]),
      backgroundColor: SERIES_COLORS[k],
      borderRadius: 3,
      maxBarThickness: 34,
    })),
  }), [rows])

  function buildTooltipRows(dataIndex) {
    const row = rows[dataIndex]
    if (!row) return []
    return SERIES_KEYS.map((k) => ({
      label: k,
      value: row[k],
      color: SERIES_COLORS[k],
    }))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Key Performance Indicators in Tamil Nadu
      </div>

      <TabBar tabs={TABS} activeTab="allowedYearWise" onChange={() => {}} />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5 mb-4">
          <Icon name="barChart" className="w-4 h-4 text-tn-blue" />
          K6. Average Days Allowed for Bid Submission - Year wise
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