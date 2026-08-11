import React, { useEffect, useRef, useState } from 'react'
import { waitForGoogleMaps, createMap, addMarkers, fitMapToMarkers, highlightMarker } from '../services/mapService'

/**
 * Google Maps component.
 *
 * Props:
 *   center        — { lat, lng }
 *   places        — [{ name/title, lat, lng, color }]
 *   activeIndex   — index of the currently highlighted place
 *   onMarkerClick — (index) => void
 *   loading       — boolean
 */
export default function MapComponent({ center, places = [], activeIndex, onMarkerClick, loading }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])
  const [mapsError, setMapsError] = useState(null)
  const [mapReady,  setMapReady]  = useState(false)

  /* Initialise map once — loads the SDK via mapService, key comes from
     VITE_GOOGLE_MAPS_JS_KEY in the frontend .env, not index.html */
  useEffect(() => {
    waitForGoogleMaps()
      .then(() => setMapReady(true))
      .catch((err) => setMapsError(err.message))
  }, [])

  /* Create map when SDK + container are ready */
  useEffect(() => {
    if (!mapReady || !containerRef.current) return
    if (mapRef.current) return // already created

    const defaultCenter = center || { lat: 10.7905, lng: 78.7047 }
    mapRef.current = createMap(containerRef.current, defaultCenter, 11)
  }, [mapReady, center])

  /* Re-center when location changes (only matters before markers exist —
     once there are markers, fitMapToMarkers below takes over framing) */
  useEffect(() => {
    if (!mapRef.current || !center || places.length) return
    mapRef.current.setCenter(center)
    mapRef.current.setZoom(12)
  }, [center]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Redraw markers when places change, then fit the viewport so every
     marker is actually visible instead of staying at the original
     center/zoom (that was the cause of only one marker ever showing) */
  useEffect(() => {
    if (!mapRef.current) return

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    if (!places.length) return

    markersRef.current = addMarkers(mapRef.current, places, onMarkerClick)
    fitMapToMarkers(mapRef.current, places)
  }, [places]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Highlight active marker */
  useEffect(() => {
    if (!markersRef.current.length) return
    if (activeIndex == null) return
    highlightMarker(markersRef.current, activeIndex, places)
  }, [activeIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  if (mapsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-tn-light
                      border border-tn-border rounded-xl text-tn-muted text-sm gap-2">
        <svg className="w-8 h-8 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="font-medium text-tn-navy">Map unavailable</p>
        <p className="text-xs text-center max-w-xs">{mapsError}</p>
        <p className="text-xs text-tn-muted">Check VITE_GOOGLE_MAPS_JS_KEY in your frontend .env</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-tn-border shadow-sm">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-tn-blue border-t-transparent
                            rounded-full animate-spin" />
            <p className="text-sm text-tn-navy font-medium">Loading map…</p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div
        ref={containerRef}
        style={{ height: '420px', width: '100%' }}
        aria-label="Google Map showing tender locations"
      />

      {/* Fallback while Maps SDK loads */}
      {!mapReady && !mapsError && (
        <div className="absolute inset-0 bg-tn-light flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-tn-blue border-t-transparent
                            rounded-full animate-spin" />
            <p className="text-sm text-tn-muted">Loading Google Maps…</p>
          </div>
        </div>
      )}

      {/* Place count badge */}
      {places.length > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-tn-navy text-white
                        text-xs font-semibold px-2.5 py-1 rounded-full shadow">
          {places.length} location{places.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}