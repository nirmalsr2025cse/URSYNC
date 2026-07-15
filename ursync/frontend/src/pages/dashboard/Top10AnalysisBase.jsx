// src/pages/dashboard/Top10AnalysisBase.jsx
// Shared implementation behind NumberWiseTop10Analysis.jsx and
// ValueWiseTop10Analysis.jsx — same chart/table toggle, sub-tabs, and rich
// tooltip, parameterized by which field to rank on. Not wired into
// Dashboard.jsx directly; the two per-metric files below are.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import DataTable from '../../components/dashboard/DataTable'
import { useThemeColors, toRgba } from '../../utils/dashboardChartUtils'
import { getTop10Entities } from '../../utils/top10Utils'

const SUB_TAB_DEFS = [
  { id: 'entity', label: 'Publishing Entity Wise', category: undefined },
  { id: 'goods', label: 'Product Category Wise-Goods', category: 'goods' },
  { id: 'services', label: 'Product Category Wise-Services', category: 'services' },
  { id: 'works', label: 'Product Category Wise-Works', category: 'works' },
]

export default function Top10AnalysisBase({ fyTo, sortKey, tagBase, unitLabel, barColorKey }) {
  const colors = useThemeColors()
  const [activeSubTab, setActiveSubTab] = useState('entity')
  const [viewMode, setViewMode] = useState('chart')

  const subTabIndex = SUB_TAB_DEFS.findIndex((t) => t.id === activeSubTab)
  const subTabDef = SUB_TAB_DEFS[subTabIndex]
  const tag = `T${tagBase + subTabIndex}`

  const { top10, all, total } = useMemo(
    () => getTop10Entities(sortKey, subTabDef?.category),
    [sortKey, subTabDef]
  )

  const barColor = colors[barColorKey] || colors.blue

  // Value Wise (Rs. in Lakhs) needs 2 decimal places in its callouts/table
  // to match the reference (e.g. "9,90,363.51"); Number Wise is a plain
  // integer count (e.g. "72,604").
  const formatValue = (v) =>
    sortKey === 'value'
      ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })
      : Number(v).toLocaleString('en-IN')

  // Chart.js draws bars in the order given, and with indexAxis: 'y' the
  // first item ends up at the bottom — reverse so the #1 ranked entity
  // renders at the top, matching the reference screenshot.
  const chartRows = useMemo(() => [...top10].reverse(), [top10])

  const chartConfig = useMemo(() => ({
    labels: chartRows.map((r) => r.name),
    datasets: [{
      label: unitLabel,
      data: chartRows.map((r) => r[sortKey]),
      backgroundColor: toRgba(barColor, 0.9),
      borderColor: barColor,
      borderRadius: 3,
      maxBarThickness: 26,
    }],
  }), [chartRows, sortKey, unitLabel, barColor])

  const tableColumns = [
    { key: 'sNo', label: 'S.No' },
    { key: 'name', label: 'Tender Publishing Entities' },
    { key: 'tenders', label: 'No. of Tenders', align: 'right', format: (v) => v.toLocaleString('en-IN') },
    { key: 'value', label: 'Value of Tenders (Rs. in Lakhs)', align: 'right', format: (v) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { key: 'bids', label: 'No. of Bids', align: 'right', format: (v) => v.toLocaleString('en-IN') },
  ]

  function buildTooltipRows(dataIndex) {
    const row = chartRows[dataIndex]
    if (!row) return []
    return [
      { label: '# Tenders', value: row.tenders, color: colors.blue },
      {
        label: '₹ Tenders (Rs. in Lakhs)',
        value: row.value,
        color: colors.emerald,
        display: row.value.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      },
      { label: '# Bids', value: row.bids, color: colors.amber },
    ]
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Top 10 Analysis in Tamil Nadu
      </div>

      <TabBar
        tabs={SUB_TAB_DEFS}
        activeTab={activeSubTab}
        onChange={(id) => { setActiveSubTab(id); setViewMode('chart') }}
      />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5">
            <Icon name="barChart" className="w-4 h-4 text-tn-blue" />
            {viewMode === 'chart'
              ? `${tag}. Top 10 Tender Publishing Entities - ${unitLabel} - Fin. Year - ${fyTo}`
              : `${tag}. Top ${total} Tender Publishing Entities - ${unitLabel} - Fin. Year - ${fyTo}`}
          </h3>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-tn-navy hidden sm:inline">Select Chart Type :-</span>
            <button
              onClick={() => setViewMode('chart')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'chart' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white/80 hover:bg-slate-600'}`}
              aria-label="Show chart"
            >
              <Icon name="barChart" className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white/80 hover:bg-slate-600'}`}
              aria-label="Show table"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="3" y="4" width="18" height="16" rx="1.5" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="9" x2="9" y2="20" />
                <line x1="15" y1="9" x2="15" y2="20" />
              </svg>
            </button>
          </div>
        </div>

        {viewMode === 'chart' ? (
          <BarChartCanvas
            labels={chartConfig.labels}
            datasets={chartConfig.datasets}
            indexAxis="y"
            yAxisLabel="Tender Publishing Entities"
            xAxisLabel={unitLabel}
            height={420}
            showValueLabels
            valueFormat={formatValue}
            richTooltip={{
              titleOverride: `For the Fin Year ${fyTo}`,
              subheading: (dataIndex) => chartRows[dataIndex]?.name,
              leftHeader: 'Description',
              rightHeader: 'Number',
              rows: buildTooltipRows,
            }}
          />
        ) : (
          <DataTable columns={tableColumns} rows={all} searchKeys={['name']} />
        )}

        {viewMode === 'table' && (
          <p className="text-xs font-semibold text-tn-navy mt-3">* Drill down is available</p>
        )}
      </div>
    </div>
  )
}