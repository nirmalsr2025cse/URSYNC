// src/pages/dashboard/PercentageDistributionBase.jsx
// Shared implementation behind NumberWisePercentageDistribution.jsx and
// ValueWisePercentageDistribution.jsx — same tab bar / pie chart / legend
// list, parameterized by which field to distribute on. Mirrors the
// Top10AnalysisBase.jsx pattern used for the Top 10 Analysis pages.
import React, { useMemo, useRef, useEffect } from 'react'
import { Chart as ChartJS, PieController, ArcElement, Tooltip, Legend } from 'chart.js'
import Icon from '../../components/Icon'
import TabBar from '../../components/dashboard/TabBar'
import { externalTooltipHandler, removeRichTooltipEls } from '../../components/dashboard/chartTooltip'
import { getCentralOrganisationsDistribution } from '../../data/dashboardMockData'

ChartJS.register(PieController, ArcElement, Tooltip, Legend)

// Fixed 20-color palette so each organisation keeps a stable color across
// re-renders/sorts, rather than Chart.js's default palette which can shift
// slightly with dataset length.
const SLICE_COLORS = [
  '#C2185B', '#2E7D32', '#E64A19', '#B71C1C', '#FBC02D', '#00BFA5', '#D81B60',
  '#039BE5', '#F06292', '#8D6E63', '#AFB42B', '#7B1FA2', '#00897B', '#3949AB',
  '#5D4037', '#0288D1', '#7CB342', '#455A64', '#AD1457', '#1565C0',
]

function PieChart({ rows }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  // Created once; data updates below mutate the existing instance so
  // switching Number Wise ↔ Value Wise (or the financial year) animates
  // between the old and new slice sizes instead of popping in fresh.
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
              titleOverride: 'Central Organisations',
              leftHeader: 'Organisation',
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
          datalabels: undefined,
        },
      },
      plugins: [{
        id: 'pieSliceLabels',
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

export default function PercentageDistributionBase({ fyTo, metricKey, unitLabel }) {
  const rows = useMemo(
    () => getCentralOrganisationsDistribution(fyTo, metricKey),
    [fyTo, metricKey]
  )

  const orgTabLabel = `Central Organizations (Top 20) - ${unitLabel}`
  const orgTabs = useMemo(() => [{ id: 'centralOrganisations', label: orgTabLabel }], [orgTabLabel])

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        Percentage Distribution
      </div>

      {/* Single-tab bar — intentionally only one entry (Central
          Organisations); no "States/UTs" option per current scope. */}
      <TabBar tabs={orgTabs} activeTab="centralOrganisations" onChange={() => {}} />

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <h3 className="font-bold text-tn-navy text-sm mb-4">
          Central Organisations (Top 20) - {unitLabel} - Fin Year {fyTo}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Legend list */}
          <div className="lg:col-span-2 max-h-[440px] overflow-y-auto pr-2">
            <h3 className="font-bold text-tn-navy text-sm mb-3 flex items-center gap-1.5">
              <Icon name="barChart" className="w-4 h-4 text-tn-blue" />
              Central Organisations
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
                    <span className="font-semibold">({row.percentage.toFixed(2)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pie chart */}
          <div className="lg:col-span-3">
            <PieChart rows={rows} />
          </div>
        </div>
      </div>
    </div>
  )
}