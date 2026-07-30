/**
 * Utility helpers for Google Maps integration.
 */
import { Loader } from '@googlemaps/js-api-loader'

const GOOGLE_MAPS_JS_KEY = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY

let loaderPromise = null

/**
 * Returns a promise that resolves once the Google Maps SDK is ready.
 * Loads the SDK on demand via @googlemaps/js-api-loader, pulling the key
 * from VITE_GOOGLE_MAPS_JS_KEY (frontend .env) — nothing hardcoded in
 * index.html, no global 'google-maps-ready' event needed anymore.
 */
export function waitForGoogleMaps() {
  if (window.google?.maps) { // Already loaded (e.g. hot-reload) — skip re-loading
    return Promise.resolve(window.google.maps)
  }

  if (!GOOGLE_MAPS_JS_KEY) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_JS_KEY in frontend .env'))
  }

  if (!loaderPromise) {
    loaderPromise = new Loader({
      apiKey: GOOGLE_MAPS_JS_KEY,
      version: 'weekly',
    })
      .importLibrary('maps')
      .then(() => window.google.maps)
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
  return new window.google.maps.Map(container, { //Creates a Map , Conatiner --> place to load <div> , center --> place to start , zoom - default zoom value
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
 * Adds markers to the map and returns the marker array.
 */
export function addMarkers(map, places, onMarkerClick) { //map --> Gmap Object Created, places --> Places JSON Object , onMarkerClick --> Use to point markers in map
  return places.map((place, idx) => {
    const marker = new window.google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map,
      title: place.name,
      label: {
        text: String(idx + 1),
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '12px',
      },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#1A4A8C',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 14,
      },
    })

    const infoWindow = new window.google.maps.InfoWindow({ //popup when click on marked place
      content: `<div style="font-family:Inter,sans-serif;padding:4px 8px;font-size:13px;font-weight:600;color:#0A2240">${place.name}</div>`,
    })

    marker.addListener('click', () => {
      infoWindow.open(map, marker)
      if (onMarkerClick) onMarkerClick(idx)
    })

    return marker
  })
}

/**
 * Highlights a specific marker (enlarges it, dims others).
 */
export function highlightMarker(markers, activeIdx) {
  markers.forEach((m, i) => {
    const isActive = i === activeIdx
    m.setIcon({
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: isActive ? '#D4A017' : '#1A4A8C',
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