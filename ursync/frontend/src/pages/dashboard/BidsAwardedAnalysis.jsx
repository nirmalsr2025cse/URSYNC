// src/pages/dashboard/BidsAwardedAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Bids Awarded.
// Three sub-tabs render Number/Value bar charts over the FY range (Tenders / Category / Type),
// and "Organization Wise" renders a real-time DataTable with department statistics.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import DataTable from '../../components/dashboard/DataTable'
import { useThemeColors, toRgba } from '../../utils/dashboardChartUtils'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

const SUB_TABS = [
  { id: 'tenders', tag: 'TR15', label: 'Bids Awarded Tenders' },
  { id: 'category', tag: 'TR16', label: 'Bids Awarded Tender Category' },
  { id: 'type', tag: 'TR17', label: 'Bids Awarded Tender Type' },
  { id: 'organization', tag: 'TR18', label: 'Bids Awarded Organization Wise' },
]

const CHART_TITLES = {
  tenders: 'Number/Value of AOC - Year Wise',
  category: 'Number/Value of AOC Category Wise - Year Wise',
  type: 'Number/Value of AOC Type Wise - Year Wise',
}

export default function BidsAwardedAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('tenders')
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState({
    tenders: [],
    categoryCount: { Works: 0, Goods: 0, Services: 0, Consultancy: 0 },
    categoryValue: { Works: 0, Goods: 0, Services: 0, Consultancy: 0 },
    typeCount: { 'Open Tender': 0, 'Limited Tender': 0, 'Single Tender': 0, EOI: 0 },
    typeValue: { 'Open Tender': 0, 'Limited Tender': 0, 'Single Tender': 0, EOI: 0 },
    organizations: [],
  })

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const defaultFy = getDefaultRollingFyRange(6)
        const from = fyFrom || defaultFy.fyFrom
        const to = fyTo || defaultFy.fyTo
        const res = await apiFetch(`/dashboard/bids-awarded?fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && res.data) {
          setAnalysisData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch bids awarded analysis data:', err)
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
    const tenders = analysisData.tenders || []
    const categoryCount = analysisData.categoryCount || {}
    const categoryValue = analysisData.categoryValue || {}
    const typeCount = analysisData.typeCount || {}
    const typeValue = analysisData.typeValue || {}

    if (activeSubTab === 'tenders') {
      return {
        labels: tenders.map((r) => r.fy),
        stacked: false,
        yAxisLabel: 'Number',
        datasets: [
          {
            label: '# Bids Awarded Tenders',
            data: tenders.map((r) => r.count || 0),
            backgroundColor: toRgba(colors.blue, 0.85),
            borderRadius: 3,
          },
          {
            label: '₹ Bids Awarded Tenders (Rs. in Crores)',
            data: tenders.map((r) => r.value || 0),
            backgroundColor: toRgba(colors.amber, 0.85),
            borderRadius: 3,
          },
        ],
      }
    }
    if (activeSubTab === 'category') {
      const keys = ['Works', 'Goods', 'Services', 'Consultancy']
      return {
        labels: keys,
        stacked: false,
        yAxisLabel: 'Number',
        datasets: [
          {
            label: '# Bids Awarded (Number)',
            data: keys.map((k) => categoryCount[k] || 0),
            backgroundColor: toRgba(colors.blue, 0.85),
            borderRadius: 3,
          },
          {
            label: '₹ Bids Awarded (Rs. in Crores)',
            data: keys.map((k) => categoryValue[k] || 0),
            backgroundColor: toRgba(colors.amber, 0.85),
            borderRadius: 3,
          },
        ],
      }
    }
    // type
    const keys = ['Open Tender', 'Limited Tender', 'Single Tender', 'EOI']
    return {
      labels: keys,
      stacked: false,
      yAxisLabel: 'Number',
      datasets: [
        {
          label: '# Bids Awarded (Number)',
          data: keys.map((k) => typeCount[k] || 0),
          backgroundColor: toRgba(colors.blue, 0.85),
          borderRadius: 3,
        },
        {
          label: '₹ Bids Awarded (Rs. in Crores)',
          data: keys.map((k) => typeValue[k] || 0),
          backgroundColor: toRgba(colors.amber, 0.85),
          borderRadius: 3,
        },
      ],
    }
  }, [activeSubTab, analysisData, colors])

  const tableColumns = [
    { key: 'sNo', label: 'S.No' },
    { key: 'name', label: 'Organization Name' },
    {
      key: 'noOfTenders',
      label: 'No. of Tenders',
      align: 'right',
      format: (v) => (v != null ? Number(v).toLocaleString('en-IN') : '0'),
    },
    {
      key: 'valOfTenders',
      label: 'Val. of Tenders (Rs. in Lakhs)',
      align: 'right',
      format: (v) =>
        v != null ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
    },
    {
      key: 'bidsAwardedCount',
      label: '#. Bids Awarded Tenders',
      align: 'right',
      format: (v) => (v != null ? Number(v).toLocaleString('en-IN') : '0'),
    },
    {
      key: 'bidsAwardedValue',
      label: '₹. Bids Awarded Tenders (Rs. in Lakhs)',
      align: 'right',
      format: (v) =>
        v != null ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Tender Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <span className="text-xs text-tn-muted font-medium animate-pulse">Loading bids awarded data...</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5">
            <Icon name="doc" className="w-4 h-4 text-tn-blue" />
            {SUB_TABS.find((t) => t.id === activeSubTab)?.tag}.{' '}
            {activeSubTab === 'organization' ? 'Number/Value of AOC Organization Wise - Year Wise' : CHART_TITLES[activeSubTab]}
          </h3>
          <span className="inline-flex items-center gap-1 text-[11px] text-tn-muted">
            <Icon name="drill" className="w-3.5 h-3.5" />
            Drill down is available
          </span>
        </div>

        {activeSubTab === 'organization' ? (
          <DataTable
            columns={tableColumns}
            rows={analysisData.organizations || []}
            searchKeys={['name']}
          />
        ) : (
          <BarChartCanvas
            labels={chartConfig.labels}
            datasets={chartConfig.datasets}
            stacked={chartConfig.stacked}
            yAxisLabel={chartConfig.yAxisLabel}
            richTooltip={{
              titlePrefix: activeSubTab === 'tenders' ? 'For the Fin Year' : '',
              leftHeader: 'Series',
              rightHeader: 'Number',
            }}
          />
        )}
      </div>
    </div>
  )
}