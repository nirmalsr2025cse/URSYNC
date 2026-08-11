//src/controllers/locationController.js
const mongoose = require('mongoose')
const Tender = require('../models/Tender')
const District = require('../models/District')
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

// ─────────────────────────────────────────────────────────────────────────
// District / Taluk driven search (powers the "Tenders by Location" page).
//
// The frontend's District and Taluk dropdowns are now driven by a fully
// static list (src/data/tnDistrictsTaluks.js on the frontend) — there is
// no API call to fetch districts or taluks anymore, and the dropdown
// values are NOT real Mongo _ids. So instead of receiving a districtId,
// this endpoint receives the district's plain NAME (e.g. "Coimbatore")
// and resolves the real District document itself before querying tenders.
// ─────────────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function tendersByDistrict(req, res) {
  res.set('Cache-Control', 'no-store')
  try {
    const districtName = String(req.query.districtName || req.query.districtId || '').trim()
    const taluk = String(req.query.taluk || '').trim()

    if (!districtName) {
      return res.status(400).json({ message: 'districtName is required' })
    }

    // Resolve the real District document by name (case-insensitive exact match).
    const districtDoc = await District.findOne({
      name: { $regex: `^${escapeRegex(districtName)}$`, $options: 'i' },
    }).lean()

    if (!districtDoc) {
      // District exists in the static frontend list but has no District
      // document / no tenders yet — return an empty, non-error result.
      return res.json({
        district: { id: null, name: districtName },
        center: null,
        markers: [],
        tenders: [],
      })
    }

    const match = { isDeleted: false, districtId: districtDoc._id }
    if (taluk) match.taluk = taluk

    const stages = [
      { $match: match },
      { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'departmentDoc' } },
      { $unwind: '$departmentDoc' },
      { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
      { $unwind: '$categoryDoc' },
      { $lookup: { from: 'districts', localField: 'districtId', foreignField: '_id', as: 'districtDoc' } },
      { $unwind: { path: '$districtDoc', preserveNullAndEmptyArrays: true } },
      { $sort: { closingDate: -1 } },
    ]

    if (req.isDepartmentRestricted && req.departmentCode) {
      stages.push({ $match: { 'departmentDoc.code': req.departmentCode } })
    }

    const docs = await Tender.aggregate(stages)
    const tenders = docs.map(toCardShape)

    const markers = tenders
      .filter((t) => t.latitude != null && t.longitude != null)
      .map((t) => ({ lat: t.latitude, lng: t.longitude, title: t.title }))

    const center = markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : null

    return res.json({
      district: { id: String(districtDoc._id), name: districtDoc.name },
      center,
      markers,
      tenders,
    })
  } catch (err) {
    console.error('locationController.tendersByDistrict error:', err.message)
    return res.status(502).json({ message: 'Failed to fetch tenders by district' })
  }
}

// Kept for any other callers (e.g. admin screens) that still want a plain
// districts list from the DB. The public "Tenders by Location" page no
// longer calls this — it uses the static frontend list instead.
async function listDistricts(req, res) {
  try {
    const districts = await District.find({}, { name: 1, code: 1 }).sort({ name: 1 }).lean()
    return res.json({
      districts: districts.map((d) => ({ id: String(d._id), name: d.name, code: d.code || null })),
    })
  } catch (err) {
    console.error('locationController.listDistricts error:', err.message)
    return res.status(502).json({ message: 'Failed to fetch districts' })
  }
}

// Kept for any other callers that still want DB-derived taluks by real
// districtId. The public "Tenders by Location" page no longer calls this —
// it uses the static frontend list instead.
async function listTaluks(req, res) {
  try {
    const districtId = String(req.query.districtId || '').trim()
    if (!districtId) {
      return res.status(400).json({ message: 'districtId is required' })
    }
    if (!mongoose.Types.ObjectId.isValid(districtId)) {
      return res.status(400).json({ message: 'Invalid districtId' })
    }

    const taluks = await Tender.distinct('taluk', {
      districtId: new mongoose.Types.ObjectId(districtId),
      isDeleted: false,
      taluk: { $exists: true, $ne: '' },
    })

    taluks.sort((a, b) => a.localeCompare(b))
    return res.json({ taluks })
  } catch (err) {
    console.error('locationController.listTaluks error:', err.message)
    return res.status(502).json({ message: 'Failed to fetch taluks' })
  }
}

module.exports = {
  autocomplete,
  placeDetails,
  nearby,
  tendersByLocation,
  listDistricts,
  listTaluks,
  tendersByDistrict,
}