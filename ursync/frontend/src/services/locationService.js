import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Search nearby locations for a given place name.
 * GET /api/location/search?location=<value>
 *
 * Expected response:
 * {
 *   center: { lat: number, lng: number },
 *   places: [{ name: string, lat: number, lng: number }]
 * }
 */
export async function getNearbyLocations(location) {
  try {
    const { data } = await api.get('/location/search', {
      params: { location },
    })
    return { data, error: null }
  } catch (err) {
    const message =
      err.response?.data?.message ||
      err.message ||
      'Failed to fetch locations. Please try again.'
    return { data: null, error: message }
  }
}

// ── Mock used when backend is not available ─────────────────────────────────
export async function getMockNearbyLocations(location) {
  await new Promise((r) => setTimeout(r, 1200))

  if (!location.trim()) {
    return { data: null, error: 'Please enter a location to search.' }
  }

  return {
    data: {
      center: { lat: 10.7905, lng: 78.7047 },
      places: [
        { name: 'Tiruchirappalli Collectorate', lat: 10.7905, lng: 78.7047 },
        { name: 'TANGEDCO Sub-station, Srirangam', lat: 10.8633, lng: 78.6884 },
        { name: 'PWD Office, Ariyamangalam',       lat: 10.7653, lng: 78.7537 },
        { name: 'Corporation Office, Woraiyur',    lat: 10.8215, lng: 78.6893 },
        { name: 'TWAD Board, Thillai Nagar',       lat: 10.8012, lng: 78.6923 },
      ],
    },
    error: null,
  }
}