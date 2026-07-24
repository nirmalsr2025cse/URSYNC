// src/components/LocationPicker.jsx
// A place-search input backed by Google Places Autocomplete. The user only
// ever sees and types a place name — lat/lng/placeId are captured silently
// in the background when they select a suggestion, so they never have to
// enter coordinates manually.
import React, { useRef, useEffect, useState } from 'react'

function useGoogleMapsScript(apiKey) {
  const [loaded, setLoaded] = useState(!!window.google?.maps)

  useEffect(() => {
    if (window.google?.maps) { setLoaded(true); return }
    if (!apiKey) { console.warn('VITE_GOOGLE_MAPS_API_KEY is not set'); return }

    const existing = document.getElementById('google-maps-script')
    if (existing) {
      existing.addEventListener('load', () => setLoaded(true))
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
  }, [apiKey])

  return loaded
}

export default function LocationPicker({ value, onChange, placeholder, inputClassName, error }) {
  const inputRef = useRef(null)
  const loaded = useGoogleMapsScript(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)

  useEffect(() => {
    if (!loaded || !inputRef.current) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'in' },
      fields: ['formatted_address', 'geometry', 'place_id', 'name'],
      types: ['geocode'],
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry) return

      onChange({
        address: place.formatted_address || place.name,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id,
      })
    })

    return () => {
      window.google.maps.event.removeListener(listener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        defaultValue={value?.address || ''}
        placeholder={placeholder || 'Start typing a place...'}
        className={inputClassName}
      />
      {value?.address && (
        <p className="text-[10px] text-[#6B7A8D] mt-1">
          {value.address} · {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
      {!loaded && (
        <p className="text-[10px] text-[#6B7A8D] mt-1">Loading location search…</p>
      )}
      {error && (
        <p className="text-[10px] text-[#F62440] mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}