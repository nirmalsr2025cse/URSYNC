// src/components/dashboard/BarChartCanvas.jsx
// Shared Chart.js bar chart wrapper used by every Tender Analysis metric
// page. Centralizing this means every chart on the Dashboard renders with
// the exact same axis/legend styling.
//
// Pass `richTooltip` to get the boxed "For the Fin Year ..." hover table
// (see chartTooltip.js) instead of the default single-line Chart.js
// tooltip. All bar charts across the Dashboard now pass this.
//
// Defaults to a vertical chart (indexAxis="x"), same as before — every
// existing caller is unaffected. Pass indexAxis="y" (as Top10AnalysisBase
// does) to get a horizontal bar chart instead: bars grow left-to-right,
// category labels move to the y-axis, and the "value" scale becomes the
// x-axis instead of the y-axis. showValueLabels draws the raw number just
// past the end/top of each bar, useful for horizontal Top 10-style charts
// where the reader wants the exact figure without hovering.
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

// Draws the dataset's raw value just past the end of each bar. Works for
// both orientations: for a vertical chart (indexAxis="x") the label sits
// just above each bar's top; for a horizontal chart (indexAxis="y") it
// sits just to the right of each bar's end.
function makeValueLabelPlugin(indexAxis, formatValue) {
  return {
    id: 'barChartValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex)
        if (meta.hidden) return
        meta.data.forEach((bar, index) => {
          const raw = dataset.data[index]
          if (raw === null || raw === undefined) return
          const label = formatValue ? formatValue(raw) : Number(raw).toLocaleString('en-IN')

          ctx.save()
          ctx.fillStyle = dataset.borderColor || dataset.backgroundColor || '#0A2240'
          ctx.font = '600 11px inherit'

          if (indexAxis === 'y') {
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.fillText(label, bar.x + 6, bar.y)
          } else {
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillText(label, bar.x, bar.y - 4)
          }
          ctx.restore()
        })
      })
    },
  }
}

export default function BarChartCanvas({
  labels,
  datasets,
  stacked = false,
  indexAxis = 'x',
  yAxisLabel = '',
  xAxisLabel = '',
  height = 320,
  richTooltip = null,
  showValueLabels = false,
  valueFormat = null,
}) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const isHorizontal = indexAxis === 'y'

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()

    const tooltipPlugin = richTooltip
      ? { enabled: false, external: (ctx) => externalTooltipHandler(ctx, richTooltip) }
      : {
          backgroundColor: '#0A2240',
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const value = isHorizontal ? ctx.parsed.x : ctx.parsed.y
              return `${ctx.dataset.label}: ${Number(value).toLocaleString('en-IN')}`
            },
          },
        }

    const plugins = showValueLabels ? [makeValueLabelPlugin(indexAxis, valueFormat)] : []

    // The "value" scale (counts/amounts) is the y-axis on a vertical chart
    // but the x-axis on a horizontal one, and vice versa for the
    // "category" scale (labels) — swap which config object feeds which
    // axis based on orientation, rather than duplicating the whole
    // options block per orientation.
    const categoryScaleConfig = {
      grid: { display: false },
      ticks: { font: { size: 11 }, color: isHorizontal ? '#0A2240' : '#6B7A8D' },
    }
    const valueScaleConfig = {
      stacked,
      beginAtZero: true,
      grid: { color: '#EEF1F5' },
      ticks: {
        font: { size: 11 },
        color: '#6B7A8D',
        callback: (v) => Number(v).toLocaleString('en-IN'),
      },
    }

    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets },
      plugins,
      options: {
        indexAxis,
        responsive: true,
        maintainAspectRatio: false,
        // Extra right-hand room so value labels on a horizontal chart
        // aren't clipped by the canvas edge.
        layout: isHorizontal && showValueLabels ? { padding: { right: 60 } } : undefined,
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
            ...(isHorizontal ? valueScaleConfig : { stacked, ...categoryScaleConfig }),
            title: isHorizontal
              ? (xAxisLabel ? { display: true, text: xAxisLabel, font: { size: 11, weight: '600' }, color: '#4B5A6B' } : undefined)
              : undefined,
          },
          y: {
            ...(isHorizontal ? categoryScaleConfig : { stacked, ...valueScaleConfig }),
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
  }, [labels, datasets, stacked, indexAxis, yAxisLabel, xAxisLabel, richTooltip, showValueLabels, valueFormat])

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  )
}