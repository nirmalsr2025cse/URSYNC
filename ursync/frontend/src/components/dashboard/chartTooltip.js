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
 *   titlePrefix     - text before the Chart.js-derived title (bar charts)
 *   titleOverride    - fixed title string, bypasses tooltip.title entirely (pie charts)
 *   leftHeader       - left table column header, default 'Label'
 *   rightHeader      - right table column header, default 'Value'
 *   rowLabelSource   - 'dataset' (bar: one row per series) | 'point' (pie: one row per slice)
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

    const rows = tooltip.dataPoints
      .map((dp) => {
        const rowLabel = config.rowLabelSource === 'point' ? dp.label : (dp.dataset.label || dp.label)
        const color = Array.isArray(dp.dataset.backgroundColor)
          ? dp.dataset.backgroundColor[dp.dataIndex]
          : dp.dataset.backgroundColor
        const value = dp.raw
        return `
          <tr>
            <td style="padding:4px 10px;">
              <span style="display:inline-flex;align-items:center;gap:6px;">
                <span style="width:8px;height:8px;border-radius:2px;background:${color};display:inline-block;"></span>
                ${rowLabel}
              </span>
            </td>
            <td style="padding:4px 10px;text-align:right;font-weight:700;">${Number(value).toLocaleString('en-IN')}</td>
          </tr>`
      })
      .join('')

    el.innerHTML = `
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;box-shadow:0 8px 20px rgba(10,34,64,0.18);font-size:11px;min-width:230px;font-family:inherit;">
        <div style="background:#5EC5D6;color:#0A2240;font-weight:700;padding:7px 10px;">
          ${title}
        </div>
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

  const { offsetLeft: canvasX, offsetTop: canvasY } = chart.canvas
  el.style.opacity = '1'
  el.style.left = canvasX + tooltip.caretX + 'px'
  el.style.top = canvasY + tooltip.caretY + 'px'
}

export function removeRichTooltipEls(canvasEl) {
  canvasEl?.parentNode?.querySelectorAll('.chart-rich-tooltip').forEach((el) => el.remove())
}