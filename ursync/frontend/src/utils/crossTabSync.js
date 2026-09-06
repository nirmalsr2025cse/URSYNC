// src/utils/crossTabSync.js
// Provides instant cross-tab messaging without page reloads.

const CHANNEL_NAME = 'ursync_channel_sync'

let channel = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME)
  }
} catch {
  channel = null
}

export function broadcastEvent(eventType, payload = {}) {
  const message = {
    eventType,
    payload,
    timestamp: Date.now(),
  }

  if (channel) {
    try {
      channel.postMessage(message)
    } catch (err) {
      console.warn('BroadcastChannel error:', err)
    }
  }

  // Fallback / complement: storage event works across tabs in all browsers
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('ursync_event_sync', JSON.stringify(message))
    }
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

export function subscribeToCrossTab(callback) {
  if (typeof window === 'undefined') return () => {}

  const handleBroadcast = (event) => {
    if (event && event.data && callback) {
      callback(event.data)
    }
  }

  const handleStorage = (event) => {
    if (event.key === 'ursync_event_sync' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue)
        if (callback) callback(parsed)
      } catch (err) {
        // Ignore parse error
      }
    }
  }

  if (channel) {
    channel.addEventListener('message', handleBroadcast)
  }
  window.addEventListener('storage', handleStorage)

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleBroadcast)
    }
    window.removeEventListener('storage', handleStorage)
  }
}
