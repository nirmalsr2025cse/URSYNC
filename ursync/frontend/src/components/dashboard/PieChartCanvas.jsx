// src/components/dashboard/PieChartCanvas.jsx
// Shared Chart.js pie chart wrapper — sibling to BarChartCanvas.jsx, kept
// separate since it registers a different Chart.js controller (Pie/Arc
// instead of Bar/Category/Linear).
//
// Pass `richTooltip` for the same boxed hover table BarChartCanvas uses
// (see chartTooltip.js). Since a pie only has one dataset, each hover
// shows a single-row table for that slice rather than one row per series.
import React, { useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  PieController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { externalTooltipHandler, removeRichTooltipEls } from './chartTooltip'

ChartJS.register(PieController, ArcElement, Tooltip, Legend)

export default function PieChartCanvas({ labels, data, colors, height = 340, richTooltip = null }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

    const tooltipPlugin = richTooltip
      ? { enabled: false, external: (ctx) => externalTooltipHandler(ctx, { ...richTooltip, rowLabelSource: 'point' }) }
      : {
          backgroundColor: '#0A2240',
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
              const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0'
              return `${ctx.label}: ${ctx.parsed.toLocaleString('en-IN')} (${pct}%)`
            },
          },
        }

    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 16, font: { size: 12 }, color: '#4B5A6B' },
          },
          tooltip: tooltipPlugin,
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      removeRichTooltipEls(canvasRef.current)
    }
  }, [labels, data, colors, richTooltip])

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  )
}