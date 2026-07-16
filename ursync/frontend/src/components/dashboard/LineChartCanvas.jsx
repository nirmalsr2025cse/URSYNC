// src/components/dashboard/LineChartCanvas.jsx
// Chart.js line-chart wrapper for trend-over-time views (currently the
// Last 12 Months Trend pages). Sibling to BarChartCanvas.jsx — kept as a
// separate component rather than folding a "type" switch into
// BarChartCanvas because line charts need their own Chart.js element
// registrations (PointElement/LineElement/LineController) and slightly
// different default styling (curved line, filled point markers) that
// don't share much with the bar-specific options.
//
// Reuses the same chartTooltip.js "boxed header + table" rich tooltip as
// every bar chart on the Dashboard, so hovering a month here looks and
// behaves consistently with the rest of the app.
import React, { useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { externalTooltipHandler, removeRichTooltipEls } from './chartTooltip'

ChartJS.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function LineChartCanvas({
  labels, datasets, yAxisLabel = '', xAxisLabel = '', height = 380, richTooltip = null,
}) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

    const tooltipPlugin = richTooltip
      ? { enabled: false, external: (ctx) => externalTooltipHandler(ctx, richTooltip) }
      : {
          backgroundColor: '#0A2240',
          padding: 10,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
          },
        }

    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds) => ({
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: ds.borderColor,
          fill: false,
          ...ds,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 11 }, color: '#4B5A6B' },
          },
          tooltip: tooltipPlugin,
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#6B7A8D' },
            title: xAxisLabel
              ? { display: true, text: xAxisLabel, font: { size: 11, weight: '600' }, color: '#4B5A6B' }
              : undefined,
          },
          y: {
            beginAtZero: true,
            grid: { color: '#EEF1F5' },
            ticks: {
              font: { size: 11 },
              color: '#6B7A8D',
              callback: (v) => Number(v).toLocaleString('en-IN'),
            },
            title: yAxisLabel
              ? { display: true, text: yAxisLabel, font: { size: 11, weight: '600' }, color: '#4B5A6B' }
              : undefined,
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      removeRichTooltipEls(canvasRef.current)
    }
  }, [labels, datasets, yAxisLabel, xAxisLabel, richTooltip])

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  )
}