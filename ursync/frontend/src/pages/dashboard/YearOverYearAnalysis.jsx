// src/pages/dashboard/YearOverYearAnalysis.jsx
// Descriptive Analysis → Year Over Year. Two local sub-tabs:
//   - "Number of Tender - YOY": current FY vs previous FY, month by month,
//     as a grouped bar chart with a % growth line overlaid on a secondary
//     (right-hand) axis. This is a Chart.js "combo" chart — two bar
//     datasets sharing the left axis plus one line dataset on its own
//     right axis — which neither BarChartCanvas.jsx (bars only, single
//     axis) nor LineChartCanvas.jsx (lines only) supports. Built directly
//     here with Chart.js rather than adding a third shared chart
//     component, since dual-axis combo charts don't come up anywhere else
//     in the Dashboard yet.
//   - "Last Three Years Trend": three FYs of monthly tender counts as a
//     plain grouped bar chart — reuses BarChartCanvas.jsx as-is.
//
// Both tabs share the same rich hover tooltip (chartTooltip.js) used by
// every other chart on the Dashboard.
import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import BarChartCanvas from '../../components/dashboard/BarChartCanvas'
import { useThemeColors, toRgba } from '../../utils/dashboardChartUtils'
import { externalTooltipHandler, removeRichTooltipEls } from '../../components/dashboard/chartTooltip'
import { useApi } from '../../api/client'
import { getDefaultRollingFyRange } from '../../utils/financialYearUtils'

ChartJS.register(
  BarController, BarElement, LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend
)

const SUB_TABS = [
  { id: 'yoy', label: 'Number of Tender - YOY' },
  { id: 'last3', label: 'Last Three Years Trend' },
]

const DEFAULT_MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

// ── Combo chart (2 bar series + 1 growth-% line, dual axis) ─────────────────
function YoYComboChart({ data, colors }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

    chartRef.current = new ChartJS(canvasRef.current, {
      data: {
        labels: data?.labels || DEFAULT_MONTH_LABELS,
        datasets: [
          {
            type: 'bar',
            label: data?.previousFYLabel || 'Previous FY',
            data: data?.previous || new Array(12).fill(0),
            backgroundColor: toRgba(colors.navy, 0.85),
            borderRadius: 2,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'bar',
            label: data?.currentFYLabel || 'Current FY',
            data: data?.current || new Array(12).fill(0),
            backgroundColor: toRgba(colors.amber, 0.9),
            borderRadius: 2,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: '% of Growth over Year',
            data: data?.growth || new Array(12).fill(0),
            borderColor: colors.emerald,
            backgroundColor: colors.emerald,
            pointBackgroundColor: colors.emerald,
            pointRadius: 3,
            borderWidth: 2,
            tension: 0.3,
            spanGaps: true,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 11 }, color: '#4B5A6B' },
          },
          tooltip: {
            enabled: false,
            external: (ctx) => externalTooltipHandler(ctx, {
              titlePrefix: 'Month:',
              leftHeader: 'Series',
              rightHeader: 'Value',
              rows: (dataIndex) => [
                { label: data?.previousFYLabel || 'Previous FY', value: data?.previous?.[dataIndex] || 0, color: colors.navy },
                { label: data?.currentFYLabel || 'Current FY', value: data?.current?.[dataIndex] || 0, color: colors.amber },
                {
                  label: '% Growth',
                  value: data?.growth?.[dataIndex] ?? 0,
                  color: colors.emerald,
                  display: data?.growth?.[dataIndex] === null ? 'N/A' : `${data?.growth?.[dataIndex]?.toFixed(2)}%`,
                },
              ],
            }),
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#6B7A8D' },
            title: { display: true, text: 'Month', font: { size: 11, weight: '600' }, color: '#4B5A6B' },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#EEF1F5' },
            ticks: { font: { size: 11 }, color: '#6B7A8D', callback: (v) => Number(v).toLocaleString('en-IN') },
            title: { display: true, text: 'Number of Tenders', font: { size: 11, weight: '600' }, color: '#4B5A6B' },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#6B7A8D', callback: (v) => `${v}%` },
            title: { display: true, text: 'Growth', font: { size: 11, weight: '600' }, color: '#4B5A6B' },
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      removeRichTooltipEls(canvasRef.current)
    }
  }, [data, colors])

  return (
    <div style={{ position: 'relative', width: '100%', height: '440px' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

export default function YearOverYearAnalysis({ fyTo, yearRange }) {
  const colors = useThemeColors()
  const { apiFetch } = useApi()
  const [activeTab, setActiveTab] = useState('yoy')
  const [loading, setLoading] = useState(false)

  const targetFy = useMemo(() => {
    if (fyTo) return fyTo
    if (yearRange) {
      const parts = yearRange.split(/[–-]/)
      const yr = parseInt(parts[parts.length - 1], 10)
      if (yr) return `${yr}-${String((yr + 1) % 100).padStart(2, '0')}`
    }
    return getDefaultRollingFyRange(6).fyTo
  }, [fyTo, yearRange])

  const [analysisData, setAnalysisData] = useState({
    yoy: {
      labels: DEFAULT_MONTH_LABELS,
      currentFYLabel: targetFy,
      previousFYLabel: '',
      current: new Array(12).fill(0),
      previous: new Array(12).fill(0),
      growth: new Array(12).fill(0),
    },
    last3: {
      labels: DEFAULT_MONTH_LABELS,
      series: [],
    },
  })

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const res = await apiFetch(`/dashboard/year-over-year?fy=${targetFy}`)
        if (isMounted && res?.success && res.data) {
          setAnalysisData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch year over year analysis:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, targetFy])

  const yoyData = analysisData.yoy
  const last3Data = analysisData.last3

  const last3Config = useMemo(() => {
    const palette = [colors.navy, colors.amber, colors.emerald]
    return {
      labels: last3Data?.labels || DEFAULT_MONTH_LABELS,
      datasets: (last3Data?.series || []).map((s, i) => ({
        label: s.label,
        data: s.data,
        backgroundColor: toRgba(palette[i % palette.length], 0.85),
        borderRadius: 2,
      })),
    }
  }, [last3Data, colors])

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Year Over Year in Tamil Nadu
      </div>

      <TabBar tabs={SUB_TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5 mb-4">
          <Icon name="barChart" className="w-4 h-4 text-tn-blue" />
          {activeTab === 'yoy'
            ? `Y1. Tender Publishing Trend over Previous Fin Year (${yoyData?.previousFYLabel || ''} & ${yoyData?.currentFYLabel || ''})`
            : `Y2. Number of Tenders Published - Last 3 Years`}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-[420px] text-tn-muted text-sm">
            <div className="w-6 h-6 border-2 border-tn-blue border-t-transparent rounded-full animate-spin mr-2" />
            Loading Year Over Year data…
          </div>
        ) : activeTab === 'yoy' ? (
          <YoYComboChart data={yoyData} colors={colors} />
        ) : (
          <BarChartCanvas
            labels={last3Config.labels}
            datasets={last3Config.datasets}
            yAxisLabel="Number of Tenders"
            height={420}
            richTooltip={{
              titlePrefix: 'Month:',
              leftHeader: 'Financial Year',
              rightHeader: 'Number of Tenders',
            }}
          />
        )}
      </div>
    </div>
  )
}