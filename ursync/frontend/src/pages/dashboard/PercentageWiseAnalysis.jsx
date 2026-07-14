// src/pages/dashboard/PercentageWiseAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Percentage Wise.
// Unlike the other Tender Analysis metrics this one is a single-year view,
// not a From–To range — it shows the Valid / Cancelled / Retender split
// for one financial year as a pie chart. The sidebar's Financial Year
// Filter is still a From/To pair (shared across the whole Tender Analysis
// group), so this page uses `fyTo` as the selected year for now. If you'd
// rather the sidebar show a single year selector specifically for this
// metric, that's a small follow-up to DashboardSidebar.jsx — say the word
// and I'll add it.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import PieChartCanvas from '../../components/dashboard/PieChartCanvas'
import { useThemeColors } from '../../utils/dashboardChartUtils'
import { TENDERS_PERCENTAGE_BY_FY, TENDERS_VALUE_PERCENTAGE_BY_FY } from '../../data/dashboardMockData'

const SUB_TABS = [
  { id: 'byNumber', tag: 'TR13', label: 'Valid Tenders,Cancelled & Retenders-by No.' },
  { id: 'byValue', tag: 'TR14', label: 'Valid Tenders,Cancelled & Retenders-by Value' },
]

export default function PercentageWiseAnalysis({ fyTo }) {
  const colors = useThemeColors()
  const [activeSubTab, setActiveSubTab] = useState('byNumber')

  const source = activeSubTab === 'byNumber' ? TENDERS_PERCENTAGE_BY_FY : TENDERS_VALUE_PERCENTAGE_BY_FY
  const row = useMemo(
    () => source.find((r) => r.fy === fyTo) || source[source.length - 1],
    [source, fyTo]
  )

  const total = row.cancelled + row.retender + row.valid
  const pct = (n) => (total ? ((n / total) * 100).toFixed(1) : '0.0')

  // Three clearly distinct colors, chosen for meaning rather than just
  // matching the reference mock: red = Cancelled (bad), violet = Retender
  // (needs attention), emerald = Valid (good) — easier to read at a glance
  // than two similar reds sitting next to each other.
  const sliceColors = ['#EF4444', '#8B5CF6', colors.emerald]

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
            {SUB_TABS.find((t) => t.id === activeSubTab)?.tag}. Percentage of Valid Tenders, Cancelled and
            Retenders by {activeSubTab === 'byNumber' ? 'Number' : 'Value'} Wise - Fin Year - {row.fy}
          </h3>
          <span className="inline-flex items-center gap-1 text-[11px] text-tn-muted">
            <Icon name="drill" className="w-3.5 h-3.5" />
            Drill down is available
          </span>
        </div>

        <PieChartCanvas
          labels={['Cancelled', 'Retender', 'Valid Tenders']}
          data={[row.cancelled, row.retender, row.valid]}
          colors={sliceColors}
          richTooltip={{
            titleOverride: `For the Fin Year ${row.fy}`,
            leftHeader: 'Type',
            rightHeader: activeSubTab === 'byNumber' ? 'Number' : 'Value (Rs. in Crores)',
          }}
        />

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-2 text-xs font-semibold">
          <span style={{ color: sliceColors[0] }}>Cancelled: {pct(row.cancelled)}%</span>
          <span style={{ color: sliceColors[1] }}>Retender: {pct(row.retender)}%</span>
          <span style={{ color: sliceColors[2] }}>Valid Tenders: {pct(row.valid)}%</span>
        </div>

        <p className="text-center text-[11px] text-tn-blue font-medium mt-4">
          * Valid Tender = Tender Published - (Cancelled Tenders + Retenders)
        </p>
      </div>
    </div>
  )
}