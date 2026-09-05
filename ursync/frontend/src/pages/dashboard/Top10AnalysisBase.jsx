// src/pages/dashboard/Top10AnalysisBase.jsx
// Shared implementation behind NumberWiseTop10Analysis.jsx and ValueWiseTop10Analysis.jsx
// Renders live Top 10 entities ranked by Number (Count) or Value (Rs. in Lakhs) with Chart and Table toggle.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import DataTable from '../../components/dashboard/DataTable'
import { useThemeColors, toRgba } from '../../utils/dashboardChartUtils'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

const SUB_TAB_DEFS = [
  { id: 'entity', label: 'Publishing Entity Wise', category: 'all' },
  { id: 'goods', label: 'Product Category Wise-Goods', category: 'goods' },
  { id: 'services', label: 'Product Category Wise-Services', category: 'services' },
  { id: 'works', label: 'Product Category Wise-Works', category: 'works' },
]

export default function Top10AnalysisBase({ fyTo, sortKey, tagBase, unitLabel, barColorKey }) {
  const colors = useThemeColors()
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('entity')
  const [viewMode, setViewMode] = useState('chart')
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState({
    top10: [],
    all: [],
    total: 0,
  })

  const subTabIndex = SUB_TAB_DEFS.findIndex((t) => t.id === activeSubTab)
  const subTabDef = SUB_TAB_DEFS[subTabIndex] || SUB_TAB_DEFS[0]
  const tag = `T${tagBase + subTabIndex}`
  const targetFy = fyTo || getDefaultRollingFyRange(6).fyTo

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const cat = subTabDef.category || 'all'
        const res = await apiFetch(`/dashboard/top10-analysis?fy=${targetFy}&category=${cat}&sortBy=${sortKey}`)
        if (isMounted && res?.success && res.data) {
          setAnalysisData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch top 10 analysis data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, targetFy, subTabDef.category, sortKey])

  const barColor = colors[barColorKey] || colors.blue

  const formatValue = (v) =>
    sortKey === 'value'
      ? Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Number(v || 0).toLocaleString('en-IN')

  // Chart.js draws bars from bottom to top with indexAxis: 'y' — reverse so #1 rank is at top
  const top10List = analysisData.top10 || []
  const chartRows = useMemo(() => [...top10List].reverse(), [top10List])

  const chartConfig = useMemo(() => ({
    labels: chartRows.map((r) => r.name),
    datasets: [{
      label: unitLabel,
      data: chartRows.map((r) => r[sortKey] || 0),
      backgroundColor: toRgba(barColor, 0.9),
      borderColor: barColor,
      borderRadius: 3,
      maxBarThickness: 26,
    }],
  }), [chartRows, sortKey, unitLabel, barColor])

  const tableColumns = [
    { key: 'sNo', label: 'S.No' },
    { key: 'name', label: 'Tender Publishing Entities' },
    { key: 'tenders', label: 'No. of Tenders', align: 'right', format: (v) => Number(v || 0).toLocaleString('en-IN') },
    {
      key: 'value',
      label: 'Value of Tenders (Rs. in Lakhs)',
      align: 'right',
      format: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
    { key: 'bids', label: 'No. of Bids', align: 'right', format: (v) => Number(v || 0).toLocaleString('en-IN') },
  ]

  function buildTooltipRows(dataIndex) {
    const row = chartRows[dataIndex]
    if (!row) return []
    return [
      { label: '# Tenders', value: row.tenders || 0, color: colors.blue },
      {
        label: '₹ Tenders (Rs. in Lakhs)',
        value: row.value || 0,
        color: colors.emerald,
        display: Number(row.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      { label: '# Bids', value: row.bids || 0, color: colors.amber },
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

      <div className="bg-white rounded-2xl border border-tn-border p-5 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <span className="text-xs text-tn-muted font-medium animate-pulse">Loading top 10 data...</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5">
            <Icon name="barChart" className="w-4 h-4 text-tn-blue" />
            {viewMode === 'chart'
              ? `${tag}. Top 10 Tender Publishing Entities - ${unitLabel} - Fin. Year - ${targetFy}`
              : `${tag}. Top ${analysisData.total || 0} Tender Publishing Entities - ${unitLabel} - Fin. Year - ${targetFy}`}
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
              titleOverride: `For the Fin Year ${targetFy}`,
              subheading: (dataIndex) => chartRows[dataIndex]?.name,
              leftHeader: 'Description',
              rightHeader: 'Number',
              rows: buildTooltipRows,
            }}
          />
        ) : (
          <DataTable columns={tableColumns} rows={analysisData.all || []} searchKeys={['name']} />
        )}

        {viewMode === 'table' && (
          <p className="text-xs font-semibold text-tn-navy mt-3">* Drill down is available</p>
        )}
      </div>
    </div>
  )
}