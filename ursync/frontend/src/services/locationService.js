// ─────────────────────────────────────────────────────────────────────────
// ADD THESE to your existing src/services/locationService.js
// (keeps the same { data, error } return contract as getAutocomplete /
// getTendersByPlaceId already in that file — swap the fetch base URL below
// for whatever axios instance / API_BASE constant the rest of the file
// already uses).
// ─────────────────────────────────────────────────────────────────────────

const API_BASE = '/api/location'

export async function getDistricts() {
  try {
    const res = await fetch(`${API_BASE}/districts`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.message || 'Failed to fetch districts' }
    return { data: json.districts, error: null }
  } catch (err) {
    return { data: null, error: 'Failed to fetch districts' }
  }
}

export async function getTaluks(districtId) {
  try {
    const res = await fetch(`${API_BASE}/taluks?districtId=${encodeURIComponent(districtId)}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.message || 'Failed to fetch taluks' }
    return { data: json.taluks, error: null }
  } catch (err) {
    return { data: null, error: 'Failed to fetch taluks' }
  }
}

export async function getTendersByDistrict(districtName, taluk) {
  try {
    const params = new URLSearchParams({ districtName })
    if (taluk) params.set('taluk', taluk)
    const res = await fetch(`${API_BASE}/tenders-by-district?${params.toString()}`, {
      cache: 'no-store',              // ← ADD THIS
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.message || 'Failed to fetch tenders' }
    return { data: json, error: null }
  } catch (err) {
    return { data: null, error: 'Failed to fetch tenders' }
  }
}