// src/utils/normalizeLocationName.js
function normalizeLocationName(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '') // strip punctuation so "Coimbatore," == "coimbatore"
}

// True if either name contains the other after normalization —
// handles "Coimbatore" matching "Coimbatore Junction" etc.
function locationNamesMatch(a, b) {
  const na = normalizeLocationName(a)
  const nb = normalizeLocationName(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

module.exports = { normalizeLocationName, locationNamesMatch }