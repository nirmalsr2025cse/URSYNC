// src/pages/dashboard/BidsAwardedAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Bids Awarded.
// Three of the four sub-tabs are Number/Value bar charts over the FY range
// (Tenders / Category / Type); "Organization Wise" is the one exception —
// table only, no chart, per the reference mock. Table's Financial Year is
// a single year (uses fyTo), same documented approach as
// PercentageWiseAnalysis for the one sub-tab that isn't a range view.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import DataTable from '../../components/dashboard/DataTable'
import { useThemeColors, toRgba, sliceByFyRange } from '../../utils/dashboardChartUtils'
import {
  BIDS_AWARDED_BY_FY,
  BIDS_AWARDED_CATEGORY_WISE_COUNT,
  BIDS_AWARDED_CATEGORY_WISE_VALUE,
  BIDS_AWARDED_TYPE_WISE_COUNT,
  BIDS_AWARDED_TYPE_WISE_VALUE,
  BIDS_AWARDED_ORGANIZATIONS,
} from '../../data/dashboardMockData'

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

// Sums a { fy, KeyA, KeyB, ... } row set (already sliced to the FY range)
// down to one total per key — used for the Category/Type sub-tabs, which
// compare categories/types over the selected range rather than per-year.
function sumByKeys(rows, keys) {
  return keys.map((k) => rows.reduce((total, row) => total + (row[k] || 0), 0))
}

export default function BidsAwardedAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const [activeSubTab, setActiveSubTab] = useState('tenders')

  const filteredTenders = useMemo(() => sliceByFyRange(BIDS_AWARDED_BY_FY, fyFrom, fyTo), [fyFrom, fyTo])
  const filteredCategoryCount = useMemo(
    () => sliceByFyRange(BIDS_AWARDED_CATEGORY_WISE_COUNT, fyFrom, fyTo), [fyFrom, fyTo]
  )
  const filteredCategoryValue = useMemo(
    () => sliceByFyRange(BIDS_AWARDED_CATEGORY_WISE_VALUE, fyFrom, fyTo), [fyFrom, fyTo]
  )
  const filteredTypeCount = useMemo(
    () => sliceByFyRange(BIDS_AWARDED_TYPE_WISE_COUNT, fyFrom, fyTo), [fyFrom, fyTo]
  )
  const filteredTypeValue = useMemo(
    () => sliceByFyRange(BIDS_AWARDED_TYPE_WISE_VALUE, fyFrom, fyTo), [fyFrom, fyTo]
  )

  const chartConfig = useMemo(() => {
    if (activeSubTab === 'tenders') {
      return {
        labels: filteredTenders.map((r) => r.fy),
        stacked: false,
        yAxisLabel: 'Number',
        datasets: [
          {
            label: '# Bids Awarded Tenders',
            data: filteredTenders.map((r) => r.count),
            backgroundColor: toRgba(colors.blue, 0.85),
            borderRadius: 3,
          },
          {
            label: '₹ Bids Awarded Tenders (Rs. in Crores)',
            data: filteredTenders.map((r) => r.value),
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
          { label: '# Bids Awarded (Number)', data: sumByKeys(filteredCategoryCount, keys), backgroundColor: toRgba(colors.blue, 0.85), borderRadius: 3 },
          { label: '₹ Bids Awarded (Rs. in Crores)', data: sumByKeys(filteredCategoryValue, keys), backgroundColor: toRgba(colors.amber, 0.85), borderRadius: 3 },
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
        { label: '# Bids Awarded (Number)', data: sumByKeys(filteredTypeCount, keys), backgroundColor: toRgba(colors.blue, 0.85), borderRadius: 3 },
        { label: '₹ Bids Awarded (Rs. in Crores)', data: sumByKeys(filteredTypeValue, keys), backgroundColor: toRgba(colors.amber, 0.85), borderRadius: 3 },
      ],
    }
  }, [activeSubTab, filteredTenders, filteredCategoryCount, filteredCategoryValue, filteredTypeCount, filteredTypeValue, colors])

  const tableColumns = [
    { key: 'sNo', label: 'S.No' },
    { key: 'name', label: 'Organization Name' },
    { key: 'noOfTenders', label: 'No. of Tenders', align: 'right', format: (v) => v.toLocaleString('en-IN') },
    { key: 'valOfTenders', label: 'Val. of Tenders (Rs. in Lakhs)', align: 'right', format: (v) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { key: 'bidsAwardedCount', label: '#. Bids Awarded Tenders', align: 'right', format: (v) => v.toLocaleString('en-IN') },
    { key: 'bidsAwardedValue', label: '₹. Bids Awarded Tenders (Rs. in Lakhs)', align: 'right', format: (v) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Tender Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
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
          <DataTable columns={tableColumns} rows={BIDS_AWARDED_ORGANIZATIONS} searchKeys={['name']} />
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