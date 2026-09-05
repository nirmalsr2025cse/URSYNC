// src/pages/dashboard/BidderDistributionAnalysis.jsx
// Distribution Analysis (top nav) → Bidder Distribution (sidebar group).
// Single cumulative district-wise view of registered bidders across Tamil Nadu.
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Chart as ChartJS, PieController, ArcElement, Tooltip, Legend } from 'chart.js'
import Icon from '../../components/Icon'
import { externalTooltipHandler, removeRichTooltipEls } from '../../components/dashboard/chartTooltip'
import { useApi } from '../../api/client'

ChartJS.register(PieController, ArcElement, Tooltip, Legend)

// Fixed color palette so each district keeps a stable color across
// re-renders, rather than Chart.js's default palette which can shift
// slightly with dataset length. 38 districts, so the 20-color base palette
// repeats — visually fine since colors only need to be locally distinct
// around the pie, not globally unique.
const SLICE_COLORS = [
  '#D97706', '#0D9488', '#1D4ED8', '#65A30D', '#16A34A', '#06B6D4', '#C026D3',
  '#DC2626', '#7C3AED', '#4338CA', '#059669', '#EA580C', '#DB2777', '#0EA5E9',
  '#84CC16', '#9333EA', '#B91C1C', '#0891B2', '#CA8A04', '#2563EB',
]

function DistrictPieChart({ rows }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  useEffect(() => {
    if (!canvasRef.current) return

    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'pie',
      data: {
        labels: rows.map((r) => r.name),
        datasets: [{
          data: rows.map((r) => r.percentage),
          backgroundColor: rows.map((_, i) => SLICE_COLORS[i % SLICE_COLORS.length]),
          borderColor: '#ffffff',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false }, // custom legend list is rendered alongside instead
          tooltip: {
            enabled: false,
            external: (ctx) => externalTooltipHandler(ctx, {
              titleOverride: 'Registered Bidders',
              leftHeader: 'District',
              rightHeader: 'Share',
              rows: (dataIndex) => {
                const r = rowsRef.current[dataIndex]
                if (!r) return []
                return [{
                  label: r.name,
                  value: r.percentage,
                  color: SLICE_COLORS[dataIndex % SLICE_COLORS.length],
                  display: `${r.percentage.toFixed(2)}%`,
                }]
              },
            }),
          },
        },
      },
      plugins: [{
        id: 'districtPieSliceLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart
          const meta = chart.getDatasetMeta(0)
          meta.data.forEach((arc, i) => {
            const value = chart.data.datasets[0].data[i]
            if (value < 1.2) return // skip labels on slivers too thin to read
            const pos = arc.tooltipPosition()
            ctx.save()
            ctx.fillStyle = '#0A2240'
            ctx.font = '600 11px inherit'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(`${value.toFixed(2)}%`, pos.x, pos.y)
            ctx.restore()
          })
        },
      }],
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
      removeRichTooltipEls(canvasRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.data.labels = rows.map((r) => r.name)
    chart.data.datasets[0].data = rows.map((r) => r.percentage)
    chart.data.datasets[0].backgroundColor = rows.map((_, i) => SLICE_COLORS[i % SLICE_COLORS.length])
    chart.update()
  }, [rows])

  return (
    <div style={{ position: 'relative', width: '100%', height: '440px' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

export default function BidderDistributionAnalysis() {
  const { apiFetch } = useApi()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const res = await apiFetch('/dashboard/bidder-distribution')
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setRows(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch bidder distribution:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch])

  return (
    <div className="space-y-5">
      <div className="inline-flex">
        <span className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full">
          Bidder Distribution
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <h3 className="font-bold text-tn-navy text-sm mb-4">
          Registered Bidders - Cumulative - Tamil Nadu
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-[440px] text-tn-muted text-sm">
            <div className="w-6 h-6 border-2 border-tn-blue border-t-transparent rounded-full animate-spin mr-2" />
            Loading bidder distribution…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Legend list */}
            <div className="lg:col-span-2 max-h-[440px] overflow-y-auto pr-2">
              <h3 className="font-bold text-tn-navy text-sm mb-3 flex items-center gap-1.5">
                <Icon name="barChart" className="w-4 h-4 text-tn-blue" />
                Districts
              </h3>
              <ul className="space-y-2">
                {rows.map((row, i) => (
                  <li key={row.name} className="flex items-start gap-2 text-xs text-tn-navy">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span>
                      {row.name}
                      <span className="font-semibold ml-1">({row.percentage.toFixed(2)}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pie chart */}
            <div className="lg:col-span-3">
              <DistrictPieChart rows={rows} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}