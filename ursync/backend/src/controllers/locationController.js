const Tender = require('../models/Tender')
const formatCurrency = require('../utils/formatCurrency')
const { locationNamesMatch } = require('../utils/normalizeLocationName')
const googlePlacesService = require('../services/googlePlacesService')

function buildJoinStages(req) {
  const stages = [
    { $match: { isDeleted: false, location: { $exists: true, $ne: '' } } },
    { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'departmentDoc' } },
    { $unwind: '$departmentDoc' },
    { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
    { $unwind: '$categoryDoc' },
    { $lookup: { from: 'districts', localField: 'districtId', foreignField: '_id', as: 'districtDoc' } },
    { $unwind: { path: '$districtDoc', preserveNullAndEmptyArrays: true } },
  ]
  if (req.isDepartmentRestricted && req.departmentCode) {
    stages.push({ $match: { 'departmentDoc.code': req.departmentCode } })
  }
  return stages
}

function toCardShape(t) {
  return {
    id: t.tenderCode,
    tenderCode: t.tenderCode,
    title: t.title,
    description: t.description,
    image: t.image,
    documentUrl: t.documentUrl || null,
    department: t.departmentDoc.name,
    departmentCode: t.departmentDoc.code,
    organization: t.departmentDoc.organization || t.departmentDoc.name,
    category: t.categoryDoc.name,
    location: t.location || (t.districtDoc ? t.districtDoc.name : ''),
    taluk: t.taluk || '',
    village: t.village || '',
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    duration: t.duration || '',
    value: formatCurrency(t.estimatedValue),
    estimatedValue: t.estimatedValue,
    startDate: t.startDate,
    closingDate: t.closingDate,
    status: t.status,
    isCancelled: t.isCancelled || false,
    isRetendered: t.isRetendered || false,
    cancelledReason: t.cancelledReason || null,
  }
}

async function autocomplete(req, res) {
  try {
    const query = String(req.query.query || '').trim()
    if (!query) {
      return res.status(400).json({ message: 'query is required' })
    }
    const predictions = await googlePlacesService.autocomplete(query)
    return res.json({ predictions })
  } catch (err) {
    console.error('locationController.autocomplete error:', err.message)
    // TEMP DEBUG: surface the real Google error to the client so it shows
    // up in the browser Network tab response body, not just server logs.
    // Revert to a generic message once the key issue is resolved.
    return res.status(502).json({
      message: 'Failed to fetch location suggestions',
      debug: err.message,
      googleStatus: err.googleStatus || null,
    })
  }
}

async function placeDetails(req, res) {
  try {
    const placeId = String(req.query.placeId || '').trim()
    if (!placeId) {
      return res.status(400).json({ message: 'placeId is required' })
    }
    const details = await googlePlacesService.placeDetails(placeId)
    return res.json({ place: details })
  } catch (err) {
    console.error('locationController.placeDetails error:', err.message)
    if (err.googleStatus === 'INVALID_REQUEST' || err.googleStatus === 'NOT_FOUND') {
      return res.status(400).json({ message: 'Invalid place ID' })
    }
    return res.status(502).json({ message: 'Failed to fetch place details' })
  }
}

async function nearby(req, res) {
  try {
    const placeId = String(req.query.placeId || '').trim()
    if (!placeId) {
      return res.status(400).json({ message: 'placeId is required' })
    }
    const center = await googlePlacesService.placeDetails(placeId)
    const nearbyPlaces = await googlePlacesService.nearbySearch(center.lat, center.lng)
    return res.json({ center: { lat: center.lat, lng: center.lng }, nearbyPlaces })
  } catch (err) {
    console.error('locationController.nearby error:', err.message)
    if (err.googleStatus === 'INVALID_REQUEST' || err.googleStatus === 'NOT_FOUND') {
      return res.status(400).json({ message: 'Invalid place ID' })
    }
    return res.status(502).json({ message: 'Failed to fetch nearby places' })
  }
}

async function tendersByLocation(req, res) {
  try {
    const placeId = String(req.query.placeId || '').trim()
    if (!placeId) {
      return res.status(400).json({ message: 'placeId is required' })
    }

    let center
    try {
      center = await googlePlacesService.placeDetails(placeId)
    } catch (err) {
      if (err.googleStatus === 'INVALID_REQUEST' || err.googleStatus === 'NOT_FOUND') {
        return res.status(400).json({ message: 'Invalid place ID' })
      }
      throw err
    }

    const nearbyPlaces = await googlePlacesService.nearbySearch(center.lat, center.lng)

    if (nearbyPlaces.length === 0) {
      return res.json({ center: { lat: center.lat, lng: center.lng }, nearbyPlaces: [], markers: [], tenders: [] })
    }

    const stages = buildJoinStages(req)
    const candidateTenders = await Tender.aggregate(stages)

    const matchedTenders = []
    const matchedPlaceIds = new Set()

    for (const tender of candidateTenders) {
      const isMatch = nearbyPlaces.some((place) => {
        const hit = locationNamesMatch(place.name, tender.location)
        if (hit) matchedPlaceIds.add(place.placeId)
        return hit
      })
      if (isMatch) matchedTenders.push(toCardShape(tender))
    }

    const matchingPlaces = nearbyPlaces.filter((p) => matchedPlaceIds.has(p.placeId))
    const markers = matchingPlaces.map((p) => ({ lat: p.lat, lng: p.lng, title: p.name }))

    return res.json({
      center: { lat: center.lat, lng: center.lng },
      nearbyPlaces: matchingPlaces,
      markers,
      tenders: matchedTenders,
    })
  } catch (err) {
    console.error('locationController.tendersByLocation error:', err.message)
    return res.status(502).json({ message: 'Failed to fetch tenders by location' })
  }
}

module.exports = { autocomplete, placeDetails, nearby, tendersByLocation }