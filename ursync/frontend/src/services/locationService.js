import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Get autocomplete suggestions for a partial location string.
 * GET /api/location/autocomplete?query=<value>
 *
 * Expected response:
 * { predictions: [{ placeId: string, description: string }] }
 */
export async function getAutocomplete(query) {
  try {
    const { data } = await api.get('/location/autocomplete', {
      params: { query },
    })
    return { data: data.predictions, error: null }
  } catch (err) {
    const message =
      err.response?.data?.message ||
      err.message ||
      'Failed to fetch suggestions. Please try again.'
    return { data: [], error: message }
  }
}

/**
 * Resolve a selected placeId to matched tenders + map data.
 * GET /api/location/tenders?placeId=<value>
 *
 * Expected response:
 * {
 *   center: { lat, lng },
 *   nearbyPlaces: [{ name, placeId, address, lat, lng }],
 *   markers: [{ lat, lng, title }],
 *   tenders: [...]
 * }
 */
export async function getTendersByPlaceId(placeId) {
  try {
    const { data } = await api.get('/location/tenders', {
      params: { placeId },
    })
    return { data, error: null }
  } catch (err) {
    const message =
      err.response?.data?.message ||
      err.message ||
      'Failed to fetch tenders for this location. Please try again.'
    return { data: null, error: message }
  }
}