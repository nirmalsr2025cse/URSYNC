// src/api/client.js
import { useCallback } from 'react'

const BASE_URL = 'http://localhost:5000/api'

export function useApi() {
  // IMPORTANT: wrapped in useCallback with an empty dependency array so
  // apiFetch has a STABLE identity across renders. Without this, useApi()
  // returns a brand-new apiFetch function on every render of whatever
  // component calls it — and any useEffect that lists apiFetch in its
  // dependency array (e.g. Applications.jsx) will then re-run on every
  // single render, call setState, trigger a re-render, get a new apiFetch,
  // and re-run again — an infinite loop. That loop is what was causing the
  // tender cards to flicker and the network tab to fire the same request
  // repeatedly.
  const apiFetch = useCallback(async (path, options = {}) => {
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
      // token missing/expired/invalid — clear stale session
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      throw new Error('Authentication required or session expired.')
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Request failed: ${res.status}`)
    }
    return res.json()
  }, [])

  // For protected, non-JSON endpoints (file streaming, e.g.
  // /temp-applications/file/:fileId) — a plain <a href="..."> can't carry
  // the Authorization header, so the backend's authMiddleware 401s it. This
  // fetches the file WITH the token attached, then hands back a local
  // blob: URL the browser can open in a new tab or download, exactly like
  // a normal link would, without ever exposing the token in a URL.
  //
  // Callers are responsible for revoking the URL with
  // URL.revokeObjectURL(url) once they're done with it (e.g. after the
  // new tab/download has started) to avoid leaking memory.
  const fetchFileBlobUrl = useCallback(async (path) => {
    const token = localStorage.getItem('token')

    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      throw new Error('Authentication required or session expired.')
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Request failed: ${res.status}`)
    }

    const blob = await res.blob()
    return URL.createObjectURL(blob)
  }, [])

  return { apiFetch, fetchFileBlobUrl }
}