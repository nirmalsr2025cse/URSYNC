// src/pages/dashboard/BidAnalysis.jsx
// Descriptive Analysis → Bid Analysis.
// Same shape as Bidder Analysis: no radio sub-metrics in the sidebar, just
// the Financial Year range filter — Dashboard.jsx renders this directly
// whenever activeGroup === 'bidAnalysis' (see GROUP_COMPONENTS there).
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba, sliceByFyRange } from '../../utils/dashboardChartUtils'
import {
  BIDS_RECEIVED_BY_FY,
  BIDS_RECEIVED_GOODS,
  BIDS_RECEIVED_SERVICES,
  BIDS_RECEIVED_WORKS,
  TENDERS_VALUE_BY_FY,
  TENDERS_VALUE_CATEGORY_WISE,
} from '../../data/dashboardMockData'

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

const SOURCE_BY_TAB = {
  received: BIDS_RECEIVED_BY_FY,
  goods: BIDS_RECEIVED_GOODS,
  services: BIDS_RECEIVED_SERVICES,
  works: BIDS_RECEIVED_WORKS,
}

const CATEGORY_KEY_BY_TAB = { goods: 'Goods', services: 'Services', works: 'Works' }

export default function BidAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const [activeSubTab, setActiveSubTab] = useState('received')

  const filtered = useMemo(
    () => sliceByFyRange(SOURCE_BY_TAB[activeSubTab], fyFrom, fyTo),
    [activeSubTab, fyFrom, fyTo]
  )

  const chartConfig = useMemo(() => ({
    labels: filtered.map((r) => r.fy),
    stacked: false,
    yAxisLabel: 'Number',
    datasets: [
      { label: 'No. of Tenders', data: filtered.map((r) => r.tenders), backgroundColor: toRgba(colors.blue, 0.85), borderRadius: 3 },
      { label: 'No of Bids', data: filtered.map((r) => r.bids), backgroundColor: toRgba(colors.amber, 0.85), borderRadius: 3 },
    ],
  }), [filtered, colors])

  // Extra tooltip rows beyond what's actually plotted — the reference mock's
  // hover card also shows tender VALUE (Rs. in Crores) and a computed
  // "Avg Bids per Tender" ratio, neither of which is one of the chart's bars.
  function buildTooltipRows(dataIndex) {
    const row = filtered[dataIndex]
    if (!row) return []

    const valueSource = activeSubTab === 'received' ? TENDERS_VALUE_BY_FY : TENDERS_VALUE_CATEGORY_WISE
    const valueRow = valueSource.find((r) => r.fy === row.fy)
    const value = activeSubTab === 'received'
      ? valueRow?.value ?? 0
      : valueRow?.[CATEGORY_KEY_BY_TAB[activeSubTab]] ?? 0
    const avgBidsPerTender = row.tenders ? row.bids / row.tenders : 0

    return [
      { label: '# Tenders', value: row.tenders, color: colors.blue },
      {
        label: '₹ Tenders (Rs. in Crores)',
        value,
        color: colors.emerald,
        display: value.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      },
      { label: '# Bids', value: row.bids, color: colors.amber },
      {
        label: 'Avg Bids per Tender',
        value: avgBidsPerTender,
        color: '#9CC5A1',
        display: avgBidsPerTender.toFixed(2),
      },
    ]
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Bids Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
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