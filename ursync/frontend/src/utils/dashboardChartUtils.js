// src/utils/dashboardChartUtils.js
// Shared helpers for every Tender Analysis metric page (NumberWiseAnalysis,
// ValueWiseAnalysis, and whichever ones come after). No JSX here on
// purpose — this file also gets imported by things that don't need React.
import { useState, useEffect } from 'react'
import { FINANCIAL_YEARS } from '../data/dashboardMockData'

// Reads the project's actual Tailwind colors at runtime (via a hidden
// probe element) so charts stay in sync with the real tn-* palette instead
// of guessing hex values that could drift from tailwind.config.js.
export function useThemeColors() {
  const [colors, setColors] = useState({
    blue: '#1D6FA5', navy: '#0A2240', muted: '#6B7A8D',
    emerald: '#10B981', amber: '#F59E0B', red: '#EF4444',
  })

  useEffect(() => {
    const probe = document.createElement('span')
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    probe.style.pointerEvents = 'none'
    document.body.appendChild(probe)

    const read = (cls, fallback) => {
      probe.className = cls
      const val = getComputedStyle(probe).color
      return val && val !== 'rgba(0, 0, 0, 0)' ? val : fallback
    }

    setColors((prev) => ({
      blue: read('text-tn-blue', prev.blue),
      navy: read('text-tn-navy', prev.navy),
      muted: read('text-tn-muted', prev.muted),
      emerald: read('text-emerald-500', prev.emerald),
      amber: read('text-amber-500', prev.amber),
      red: read('text-red-500', prev.red),
    }))

    document.body.removeChild(probe)
  }, [])

  return colors
}

export function toRgba(rgbString, alpha) {
  const nums = rgbString.match(/\d+(\.\d+)?/g)
  if (!nums) return rgbString
  const [r, g, b] = nums
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Slices any { fy, ... } row array down to the [fyFrom, fyTo] range,
// regardless of which order the two were picked in.
export function sliceByFyRange(rows, fyFrom, fyTo) {
  const fromIdx = FINANCIAL_YEARS.indexOf(fyFrom)
  const toIdx = FINANCIAL_YEARS.indexOf(fyTo)
  const [lo, hi] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
  return rows.filter((r) => {
    const idx = FINANCIAL_YEARS.indexOf(r.fy)
    return idx >= lo && idx <= hi
  })
}