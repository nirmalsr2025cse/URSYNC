/**
 * Utility helpers for Google Maps integration.
 */
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

const GOOGLE_MAPS_JS_KEY = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY

let loaderPromise = null
let optionsSet = false

/**
 * Returns a promise that resolves to the `maps` library namespace once the
 * Google Maps SDK is ready. We resolve with the object importLibrary()
 * gives us directly, rather than trusting window.google.maps to be
 * populated — that's what was causing "Map is not a constructor".
 */
export function waitForGoogleMaps() {
  if (window.google?.maps?.Map) { // Already loaded (e.g. hot-reload) — skip re-loading
    return Promise.resolve(window.google.maps)
  }

  if (!GOOGLE_MAPS_JS_KEY) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_JS_KEY in frontend .env'))
  }

  if (!loaderPromise) {
    if (!optionsSet) {
      setOptions({
        key: GOOGLE_MAPS_JS_KEY,
        v: 'weekly',
      })
      optionsSet = true
    }

    // Load both the 'maps' library (Map, InfoWindow, SymbolPath) and the
    // 'marker' library (Marker) up front — createMap/addMarkers need both.
    loaderPromise = Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
    ])
      .then(([mapsLib]) => mapsLib) // mapsLib === window.google.maps, returned directly
      .catch((err) => {
        loaderPromise = null // allow retry on next call if it failed
        throw new Error('Google Maps failed to load: ' + err.message)
      })
  }

  return loaderPromise
}

/**
 * Creates a styled Google Map centred on the given coordinates.
 */
export function createMap(container, center, zoom = 12) {
  return new window.google.maps.Map(container, {
    center,
    zoom,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    styles: [
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    ],
  })
}

/**
 * Adds markers to the map and returns the marker array. Accepts an
 * optional per-place `color` (falls back to navy) and reads `title`
 * with `name` as a fallback so callers using either key work.
 */
export function addMarkers(map, places, onMarkerClick) {
  return places.map((place, idx) => {
    const label = place.title || place.name || ''
    const color = place.color || '#1A4A8C'

    const marker = new window.google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map,
      title: label,
      label: {
        text: String(idx + 1),
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '12px',
      },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 14,
      },
    })

    const infoWindow = new window.google.maps.InfoWindow({
      content: `<div style="font-family:Inter,sans-serif;padding:4px 8px;font-size:13px;font-weight:600;color:#0A2240">${label}</div>`,
    })

    marker.addListener('click', () => {
      infoWindow.open(map, marker)
      if (onMarkerClick) onMarkerClick(idx)
    })

    return marker
  })
}

/**
 * Fits the map viewport so every marker is visible. Call this after
 * addMarkers() whenever there's more than one point — otherwise the map
 * stays at its original center/zoom and markers outside that view are
 * never seen even though they were created correctly.
 */
export function fitMapToMarkers(map, places) {
  if (!places.length) return

  if (places.length === 1) {
    map.setCenter({ lat: places[0].lat, lng: places[0].lng })
    map.setZoom(14)
    return
  }

  const bounds = new window.google.maps.LatLngBounds()
  places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
  map.fitBounds(bounds, 48) // 48px padding so edge markers aren't clipped
}

/**
 * Highlights a specific marker (enlarges it, dims others). Preserves each
 * marker's own status color instead of overwriting it with a single blue.
 */
export function highlightMarker(markers, activeIdx, places = []) {
  markers.forEach((m, i) => {
    const isActive = i === activeIdx
    const baseColor = places[i]?.color || '#1A4A8C'
    m.setIcon({
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: isActive ? '#D4A017' : baseColor,
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: isActive ? 3 : 2,
      scale: isActive ? 18 : 14,
    })
  })
}

/**
 * Builds a Google Maps directions URL.
 */
export function buildDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}