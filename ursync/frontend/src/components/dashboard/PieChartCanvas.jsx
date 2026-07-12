// src/components/dashboard/PieChartCanvas.jsx
// Shared Chart.js pie chart wrapper — sibling to BarChartCanvas.jsx, kept
// separate since it registers a different Chart.js controller (Pie/Arc
// instead of Bar/Category/Linear).
import React, { useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  PieController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(PieController, ArcElement, Tooltip, Legend)

export default function PieChartCanvas({ labels, data, colors, height = 340 }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

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
          tooltip: {
            backgroundColor: '#0A2240',
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
                const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0'
                return `${ctx.label}: ${ctx.parsed.toLocaleString('en-IN')} (${pct}%)`
              },
            },
          },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [labels, data, colors])

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  )
}