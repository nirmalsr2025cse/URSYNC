// src/pages/dashboard/LastTwelveMonthsTrendBase.jsx
// Shared implementation behind TendersPublishedTrend.jsx,
// BidsReceivedTrend.jsx, and TenderPublishingEntitiesTrend.jsx — same
// header/tag/line-chart/rich-tooltip, parameterized by which field is the
// plotted metric. Mirrors the Top10AnalysisBase.jsx pattern used for the
// Top 10 Analysis pages.
import React, { useMemo } from 'react'
import Icon from '../../components/Icon'
import LineChartCanvas from '../../components/dashboard/LineChartCanvas'
import { getLastTwelveMonths } from '../../data/dashboardMockData'

export default function LastTwelveMonthsTrendBase({ tag, title, badgeLabel, metricKey, unitLabel, lineColor }) {
  const months = useMemo(() => getLastTwelveMonths(), [])
  const latest = months[months.length - 1]

  const chartConfig = useMemo(() => ({
    labels: months.map((m) => m.label),
    datasets: [{
      label: unitLabel,
      data: months.map((m) => m[metricKey]),
      borderColor: lineColor,
      backgroundColor: lineColor,
    }],
  }), [months, metricKey, unitLabel, lineColor])

  function buildTooltipRows(dataIndex) {
    const row = months[dataIndex]
    if (!row) return []
    return [
      { label: '# Tenders', value: row.tenders, color: '#1A4A8C' },
      {
        label: '₹ Tenders (Rs. in Crores)',
        value: row.value,
        color: '#059669',
        display: row.value.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      },
      { label: '# Bids', value: row.bids, color: '#D97706' },
    ]
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Last 12 Months Trend in Tamil Nadu
      </div>

      <div className="inline-flex">
        <span className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full">
          {badgeLabel}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5 mb-4">
          <Icon name="barChart" className="w-4 h-4 text-tn-blue" />
          {tag}. {title}
        </h3>

        <LineChartCanvas
          labels={chartConfig.labels}
          datasets={chartConfig.datasets}
          yAxisLabel={unitLabel}
          xAxisLabel="Period"
          height={420}
          richTooltip={{
            titleOverride: latest ? `During the Month ${latest.label}` : '',
            leftHeader: 'Categories',
            rightHeader: '',
            rows: buildTooltipRows,
          }}
        />
      </div>
    </div>
  )
}