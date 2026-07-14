// src/components/dashboard/BarChartCanvas.jsx
// Shared Chart.js bar chart wrapper used by every Tender Analysis metric
// page. Centralizing this means every chart on the Dashboard renders with
// the exact same axis/legend styling.
//
// Pass `richTooltip` to get the boxed "For the Fin Year ..." hover table
// (see chartTooltip.js) instead of the default single-line Chart.js
// tooltip. All bar charts across the Dashboard now pass this.
import React, { useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { externalTooltipHandler, removeRichTooltipEls } from './chartTooltip'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function BarChartCanvas({
  labels, datasets, stacked = false, yAxisLabel = '', height = 320, richTooltip = null,
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
      type: 'bar',
      data: { labels, datasets },
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
            stacked,
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#6B7A8D' },
          },
          y: {
            stacked,
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
  }, [labels, datasets, stacked, yAxisLabel, richTooltip])

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  )
}