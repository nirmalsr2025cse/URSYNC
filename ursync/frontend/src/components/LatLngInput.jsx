// src/components/LatLngInput.jsx
// A single text box where the user pastes "lat, long" (exactly what Google
// Maps gives you when you right-click a point and copy the coordinates).
// No API key, no billing, no map widget — just parse + validate.
import React, { useState } from 'react'

// Accepts formats like:
//   "11.0227, 76.9295"
//   "11.0227,76.9295"
//   "11.0227 76.9295"
function parseLatLng(raw) {
  const cleaned = raw.trim().replace(/[()]/g, '')
  const parts = cleaned.split(/[,\s]+/).map((p) => p.trim())

  if (parts.length !== 2) return null

  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (lat < -90 || lat > 90) return null
  if (lng < -180 || lng > 180) return null

  return { lat, lng }
}

export default function LatLngInput({ value, onChange, placeholder, inputClassName, error }) {
  const [rawText, setRawText] = useState(
    value ? `${value.lat}, ${value.lng}` : ''
  )
  const [parseError, setParseError] = useState('')

  function handleChange(e) {
    const text = e.target.value
    setRawText(text)

    if (!text.trim()) {
      setParseError('')
      onChange(null)
      return
    }

    const parsed = parseLatLng(text)
    if (parsed) {
      setParseError('')
      onChange(parsed)
    } else {
      setParseError('Enter as: latitude, longitude (e.g. 11.0227, 76.9295)')
      onChange(null)
    }
  }

  return (
    <div>
      <input
        type="text"
        value={rawText}
        onChange={handleChange}
        placeholder={placeholder || 'e.g. 11.0227, 76.9295'}
        className={inputClassName}
      />
      <p className="text-[10px] text-[#6B7A8D] mt-1">
        Tip: Open Google Maps, right-click the exact spot, then click the
        coordinates shown at the top of the menu — it copies them in this
        format automatically.
      </p>
      {(parseError || error) && (
        <p className="text-[10px] text-[#F62440] mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {parseError || error}
        </p>
      )}
    </div>
  )
}