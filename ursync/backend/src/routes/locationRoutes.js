// src/routes/locationRoutes.js
const express = require('express')
const router = express.Router()
const locationController = require('../controllers/locationController')

// ── Legacy Google-Places-driven endpoints (kept, still used elsewhere) ────
// GET /api/location/autocomplete?query=Coimbatore
router.get('/autocomplete', locationController.autocomplete)

// GET /api/location/place-details?placeId=xxx
router.get('/place-details', locationController.placeDetails)

// GET /api/location/nearby?placeId=xxx
router.get('/nearby', locationController.nearby)

// GET /api/location/tenders?placeId=xxx
router.get('/tenders', locationController.tendersByLocation)

// ── New District / Taluk driven endpoints (Tenders by Location page) ─────
// GET /api/location/districts
router.get('/districts', locationController.listDistricts)

// GET /api/location/taluks?districtId=xxx
router.get('/taluks', locationController.listTaluks)

// GET /api/location/tenders-by-district?districtId=xxx&taluk=yyy
router.get('/tenders-by-district', locationController.tendersByDistrict)

module.exports = router