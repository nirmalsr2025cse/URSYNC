// src/components/dashboard/chartTooltip.js
// Shared "boxed header + two-column table" hover tooltip, used by both
// BarChartCanvas and PieChartCanvas via Chart.js's external tooltip hook.
// No JSX here — this builds raw HTML for Chart.js to inject.

function getOrCreateTooltipEl(chart) {
  let el = chart.canvas.parentNode.querySelector('.chart-rich-tooltip')
  if (!el) {
    el = document.createElement('div')
    el.className = 'chart-rich-tooltip'
    el.style.position = 'absolute'
    el.style.pointerEvents = 'none'
    el.style.transition = 'opacity 0.1s ease'
    el.style.zIndex = '20'
    chart.canvas.parentNode.appendChild(el)
  }
  return el
}

/**
 * config:
 *   caption          - optional gray banner line above the header (e.g. "Click on it for further drill down")
 *   titlePrefix     - text before the Chart.js-derived title (bar charts)
 *   titleOverride    - fixed title string, bypasses tooltip.title entirely (pie charts)
 *   subheading       - optional string OR function(dataIndex, dataPoints) => string.
 *                       Rendered as a bold line between the header and the table
 *                       (e.g. the entity name in a Top 10 horizontal bar chart).
 *   leftHeader       - left table column header, default 'Label'
 *   rightHeader      - right table column header, default 'Value'
 *   rowLabelSource   - 'dataset' (bar: one row per series) | 'point' (pie: one row per slice)
 *   rows             - optional function(dataIndex, dataPoints) => [{ label, value, color, display }]
 *                      Use this when the table needs to show more than what's actually
 *                      plotted (e.g. a computed average, or a value not on the chart at all).
 *                      Falls back to one row per dataPoint when omitted.
 */
export function externalTooltipHandler(context, config = {}) {
  const { chart, tooltip } = context
  const el = getOrCreateTooltipEl(chart)

  if (tooltip.opacity === 0) {
    el.style.opacity = '0'
    return
  }

  if (tooltip.body) {
    const title = config.titleOverride ?? `${config.titlePrefix || ''} ${tooltip.title?.[0] || ''}`.trim()
    const dataIndex = tooltip.dataPoints?.[0]?.dataIndex

    const subheadingText = typeof config.subheading === 'function'
      ? config.subheading(dataIndex, tooltip.dataPoints)
      : config.subheading

    const rowsData = typeof config.rows === 'function'
      ? config.rows(dataIndex, tooltip.dataPoints)
      : tooltip.dataPoints.map((dp) => ({
          label: config.rowLabelSource === 'point' ? dp.label : (dp.dataset.label || dp.label),
          value: dp.raw,
          color: Array.isArray(dp.dataset.backgroundColor) ? dp.dataset.backgroundColor[dp.dataIndex] : dp.dataset.backgroundColor,
        }))

    const rows = rowsData
      .map((r) => {
        let displayVal = r.display
        if (displayVal === undefined || displayVal === null) {
          if (typeof r.value === 'number') {
            displayVal = Number.isFinite(r.value) ? r.value.toLocaleString('en-IN') : '0'
          } else if (typeof r.value === 'string') {
            displayVal = r.value
          } else if (r.value === undefined || r.value === null) {
            displayVal = '0'
          } else {
            const num = Number(r.value)
            displayVal = Number.isFinite(num) ? num.toLocaleString('en-IN') : String(r.value)
          }
        }
        return `
        <tr>
          <td style="padding:4px 10px;">
            <span style="display:inline-flex;align-items:center;gap:6px;">
              <span style="width:8px;height:8px;border-radius:2px;background:${r.color};display:inline-block;"></span>
              ${r.label}
            </span>
          </td>
          <td style="padding:4px 10px;text-align:right;font-weight:700;">${displayVal}</td>
        </tr>`
      })
      .join('')

    const caption = config.caption
      ? `<div style="background:#EAEAEA;color:#6B7A8D;font-size:10px;font-weight:600;padding:5px 10px;">${config.caption}</div>`
      : ''

    const subheading = subheadingText
      ? `<div style="background:#F2FAFB;color:#0A2240;font-weight:700;padding:6px 10px;">${subheadingText}</div>`
      : ''

    el.innerHTML = `
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;box-shadow:0 8px 20px rgba(10,34,64,0.18);font-size:11px;min-width:230px;font-family:inherit;">
        ${caption}
        <div style="background:#5EC5D6;color:#0A2240;font-weight:700;padding:7px 10px;">
          ${title}
        </div>
        ${subheading}
        <table style="width:100%;border-collapse:collapse;color:#0A2240;">
          <thead>
            <tr style="background:#EAF6F8;">
              <th style="text-align:left;padding:4px 10px;font-weight:700;">${config.leftHeader || 'Label'}</th>
              <th style="text-align:right;padding:4px 10px;font-weight:700;">${config.rightHeader || 'Value'}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  el.style.opacity = '1'
  el.style.left = '0px'
  el.style.top = '0px'

  const { offsetLeft: canvasX, offsetTop: canvasY, offsetWidth: canvasWidth } = chart.canvas
  const canvasRect = chart.canvas.getBoundingClientRect()

  let left = canvasX + tooltip.caretX
  let top = canvasY + tooltip.caretY

  // Measured only after innerHTML is set, so this reflects the actual
  // rendered size (which varies with how many rows the table has).
  const tooltipWidth = el.offsetWidth
  const tooltipHeight = el.offsetHeight

  // Stay inside the chart's own canvas first...
  if (left + tooltipWidth > canvasX + canvasWidth) left = canvasX + canvasWidth - tooltipWidth
  if (left < canvasX) left = canvasX

  // ...then clamp against the viewport as a hard backstop — this is the
  // part that actually fixes narrow phone screens, where the canvas can
  // be nearly as wide as the viewport itself.
  const viewportLeft = canvasRect.left + (left - canvasX)
  const overflowRight = viewportLeft + tooltipWidth - window.innerWidth
  if (overflowRight > 0) left -= overflowRight + 8
  const overflowLeft = canvasRect.left + (left - canvasX)
  if (overflowLeft < 0) left -= overflowLeft - 8

  // If it would run off the bottom of the screen, flip it above the
  // hovered point instead of clipping.
  const viewportTop = canvasRect.top + (top - canvasY)
  if (viewportTop + tooltipHeight > window.innerHeight) {
    top = canvasY + tooltip.caretY - tooltipHeight - 12
  }

  el.style.left = left + 'px'
  el.style.top = top + 'px'
}

export function removeRichTooltipEls(canvasEl) {
  canvasEl?.parentNode?.querySelectorAll('.chart-rich-tooltip').forEach((el) => el.remove())
}