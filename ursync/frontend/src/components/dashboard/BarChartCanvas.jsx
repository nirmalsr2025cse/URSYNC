// src/components/dashboard/BarChartCanvas.jsx
// Shared Chart.js bar chart wrapper used by every Tender Analysis metric
// page. Centralizing this means every chart on the Dashboard renders with
// the exact same axis/tooltip/legend styling.
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

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function BarChartCanvas({ labels, datasets, stacked = false, yAxisLabel = '', height = 320 }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

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
          tooltip: {
            backgroundColor: '#0A2240',
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
            },
          },
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

    return () => chartRef.current?.destroy()
  }, [labels, datasets, stacked, yAxisLabel])

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  )
}