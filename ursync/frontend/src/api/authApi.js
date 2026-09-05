// src/api/authApi.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`)
  }

  return data // { message, token, user }
}

export function signupRequest(payload) {
  return request('/auth/signup', payload)
}

export function loginRequest(payload) {
  return request('/auth/login', payload)
}

export async function getMeRequest() {
  const token = localStorage.getItem('token')
  if (!token) return null

  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`)
  }

  return data // { success: true, user, role }
}