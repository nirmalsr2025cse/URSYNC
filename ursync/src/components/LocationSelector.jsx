import React from 'react'
import { buildDirectionsUrl } from '../services/mapService'

/**
 * Directions section: dropdown of plotted locations + "Get Directions" button.
 */
export default function LocationSelector({ places = [], disabled }) {
  const [selectedIdx, setSelectedIdx] = React.useState('')

  const handleGetDirections = () => {
    if (selectedIdx === '') return
    const place = places[Number(selectedIdx)]
    window.open(buildDirectionsUrl(place.lat, place.lng), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-tn-navy mb-1 flex items-center gap-2">
        <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Get Directions
      </h3>
      <p className="text-xs text-tn-muted mb-4">
        Select a plotted location and open turn-by-turn directions in Google Maps.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="location-select" className="block text-xs font-medium text-tn-muted mb-1">
            Select marked location
          </label>
          <select
            id="location-select"
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(e.target.value)}
            disabled={disabled || places.length === 0}
            className="input-base disabled:bg-tn-cream disabled:cursor-not-allowed"
          >
            <option value="">— choose a location —</option>
            {places.map((place, idx) => (
              <option key={idx} value={idx}>
                {idx + 1}. {place.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleGetDirections}
            disabled={selectedIdx === '' || disabled}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            Get Directions
          </button>
        </div>
      </div>

      {places.length === 0 && (
        <p className="mt-3 text-xs text-tn-muted italic">
          Search for a location above to enable directions.
        </p>
      )}
    </div>
  )
}