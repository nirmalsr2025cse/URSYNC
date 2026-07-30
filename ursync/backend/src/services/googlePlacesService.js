// src/services/googlePlacesService.js
const axios = require('axios')

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

const client = axios.create({ timeout: 8000 })

async function autocomplete(query) {
  const { data } = await client.get(`${PLACES_BASE}/autocomplete/json`, {
    params: {
      input: query,
      key: GOOGLE_MAPS_API_KEY,
      components: 'country:in',
      types: '(regions)',
    },
  })

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    const err = new Error(`Google Autocomplete failed: ${data.status}`)
    err.googleStatus = data.status
    throw err
  }

  return (data.predictions || []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
  }))
}

async function placeDetails(placeId) {
  const { data } = await client.get(`${PLACES_BASE}/details/json`, {
    params: {
      place_id: placeId,
      key: GOOGLE_MAPS_API_KEY,
      fields: 'geometry,name,formatted_address',
    },
  })

  if (data.status !== 'OK') {
    const err = new Error(`Google Place Details failed: ${data.status}`)
    err.googleStatus = data.status
    throw err
  }

  const { result } = data
  return {
    name: result.name,
    address: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  }
}

async function nearbySearch(lat, lng, radiusMeters = 5000) {
  const { data } = await client.get(`${PLACES_BASE}/nearbysearch/json`, {
    params: {
      location: `${lat},${lng}`,
      radius: radiusMeters,
      key: GOOGLE_MAPS_API_KEY,
    },
  })

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    const err = new Error(`Google Nearby Search failed: ${data.status}`)
    err.googleStatus = data.status
    throw err
  }

  return (data.results || []).map((r) => ({
    name: r.name,
    placeId: r.place_id,
    address: r.vicinity || '',
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
  }))
}

module.exports = { autocomplete, placeDetails, nearbySearch }