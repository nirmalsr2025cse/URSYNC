// src/pages/dashboard/BidderWiseAnalysis.jsx
// Descriptive Analysis → Bidder Analysis.
// This group has no radio sub-metrics in the sidebar (just the Financial
// Year range filter), so Dashboard.jsx renders this directly whenever
// activeGroup === 'bidderAnalysis' — see GROUP_COMPONENTS there.
import React, { useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba, sliceByFyRange } from '../../utils/dashboardChartUtils'
import { BIDDER_MSME_BY_FY } from '../../data/dashboardMockData'

// Only one sub-tab exists today, but it still goes through the shared
// TabBar so the look stays consistent if more get added later.
const SUB_TABS = [{ id: 'msme', tag: 'BI1', label: 'MSME vs Non MSME Bidders' }]

export default function BidderWiseAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const filtered = useMemo(() => sliceByFyRange(BIDDER_MSME_BY_FY, fyFrom, fyTo), [fyFrom, fyTo])

  const chartConfig = useMemo(() => {
    const msmeColor = '#EC4899' // pink — distinct from the rest of the palette, matches the reference
    return {
      labels: filtered.map((r) => r.fy),
      stacked: false,
      yAxisLabel: 'No.of Bidders',
      datasets: [
        { label: 'MSME Bidders', data: filtered.map((r) => r.msme), backgroundColor: toRgba(msmeColor, 0.9), borderRadius: 3 },
        { label: 'Non_MSME Bidders', data: filtered.map((r) => r.nonMsme), backgroundColor: toRgba(colors.emerald, 0.85), borderRadius: 3 },
        { label: 'Total Registered Bidders', data: filtered.map((r) => r.total), backgroundColor: toRgba(colors.blue, 0.85), borderRadius: 3 },
      ],
    }
  }, [filtered, colors])

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Bidder Wise Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab="msme" onChange={() => {}} />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
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