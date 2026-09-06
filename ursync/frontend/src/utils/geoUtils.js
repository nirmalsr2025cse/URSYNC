// src/utils/geoUtils.js

export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return null
  }
  const nLat1 = Number(lat1)
  const nLon1 = Number(lon1)
  const nLat2 = Number(lat2)
  const nLon2 = Number(lon2)
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null

  const R = 6371 // Earth radius in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

export function isTenderRangeApproxMatch(lat1, lon1, lat2, lon2, rangeKm, tolerancePercent = 0.4, minToleranceKm = 5) {
  const calcDist = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2)
  if (calcDist === null || rangeKm === null || rangeKm === undefined || isNaN(Number(rangeKm))) {
    return { isValid: true, calculatedDistance: calcDist }
  }
  const numRange = Number(rangeKm)
  const diff = Math.abs(numRange - calcDist)
  const maxAllowedDiff = Math.max(minToleranceKm, calcDist * tolerancePercent)
  return {
    isValid: diff <= maxAllowedDiff,
    calculatedDistance: calcDist,
    difference: Math.round(diff * 100) / 100,
  }
}
