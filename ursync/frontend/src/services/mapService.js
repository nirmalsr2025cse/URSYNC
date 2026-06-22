/**
 * Utility helpers for Google Maps integration.
 */

/**
 * Returns a promise that resolves once the Google Maps SDK is ready.
 */
export function waitForGoogleMaps(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (window.googleMapsReady && window.google?.maps) {
      return resolve(window.google.maps)
    }
    const timer = setTimeout(() => {
      reject(new Error('Google Maps failed to load within the timeout period.'))
    }, timeoutMs)

    window.addEventListener('google-maps-ready', () => {
      clearTimeout(timer)
      resolve(window.google.maps)
    })
  })
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
 * Adds markers to the map and returns the marker array.
 */
export function addMarkers(map, places, onMarkerClick) {
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

    const infoWindow = new window.google.maps.InfoWindow({
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