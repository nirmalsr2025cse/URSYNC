// src/pages/dashboard/PercentageWiseAnalysis.jsx
// Descriptive Analysis → Tender Analysis → Percentage Wise.
// Shows Valid / Cancelled / Retender split for the selected financial year as a pie chart.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import PieChartCanvas from '../../components/dashboard/PieChartCanvas'
import { useThemeColors } from '../../utils/dashboardChartUtils'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

const SUB_TABS = [
  { id: 'byNumber', tag: 'TR13', label: 'Valid Tenders,Cancelled & Retenders-by No.' },
  { id: 'byValue', tag: 'TR14', label: 'Valid Tenders,Cancelled & Retenders-by Value' },
]

export default function PercentageWiseAnalysis({ fyFrom, fyTo }) {
  const colors = useThemeColors()
  const { apiFetch } = useApi()
  const [activeSubTab, setActiveSubTab] = useState('byNumber')
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState({
    byNumber: [],
    byValue: [],
  })

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const defaultFy = getDefaultRollingFyRange(6)
        const from = fyFrom || defaultFy.fyFrom
        const to = fyTo || defaultFy.fyTo
        const res = await apiFetch(`/dashboard/percentage-wise?fyFrom=${from}&fyTo=${to}`)
        if (isMounted && res?.success && res.data) {
          setAnalysisData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch percentage-wise analysis data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, fyFrom, fyTo])

  const targetFy = fyTo || getDefaultRollingFyRange(6).fyTo
  const list = activeSubTab === 'byNumber' ? analysisData.byNumber : analysisData.byValue
  const row = useMemo(() => {
    if (!list || list.length === 0) {
      return { fy: targetFy, cancelled: 0, retender: 0, valid: 0 }
    }
    return list.find((r) => r.fy === targetFy) || list[list.length - 1]
  }, [list, targetFy])

  const total = (row.cancelled || 0) + (row.retender || 0) + (row.valid || 0)
  const pct = (n) => (total ? ((n / total) * 100).toFixed(1) : '0.0')

  const sliceColors = ['#EF4444', '#8B5CF6', colors.emerald]

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Tender Analysis in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeSubTab} onChange={setActiveSubTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <span className="text-xs text-tn-muted font-medium animate-pulse">Loading percentage analysis...</span>
          </div>
        )}
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
          data={[row.cancelled || 0, row.retender || 0, row.valid || 0]}
          colors={sliceColors}
          richTooltip={{
            titleOverride: `For the Fin Year ${row.fy}`,
            leftHeader: 'Type',
            rightHeader: activeSubTab === 'byNumber' ? 'Number' : 'Value (Rs. in Crores)',
          }}
        />

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-2 text-xs font-semibold">
          <span style={{ color: sliceColors[0] }}>Cancelled: {pct(row.cancelled || 0)}%</span>
          <span style={{ color: sliceColors[1] }}>Retender: {pct(row.retender || 0)}%</span>
          <span style={{ color: sliceColors[2] }}>Valid Tenders: {pct(row.valid || 0)}%</span>
        </div>

        <p className="text-center text-[11px] text-tn-blue font-medium mt-4">
          * Valid Tender = Tender Published - (Cancelled Tenders + Retenders)
        </p>
      </div>
    </div>
  )
}