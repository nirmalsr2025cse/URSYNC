// src/api/client.js
const BASE_URL = 'http://localhost:5000/api'

export function useApi() {
  async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token')

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    if (res.status === 401) {
      // token missing/expired/invalid — force re-login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      throw new Error('Session expired. Please sign in again.')
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Request failed: ${res.status}`)
    }
    return res.json()
  }

  return { apiFetch }
}