// src/routes/locationRoutes.js
const express = require('express')
const router = express.Router()
const locationController = require('../controllers/locationController')

// GET /api/location/autocomplete?query=Coimbatore
router.get('/autocomplete', locationController.autocomplete)

// GET /api/location/place-details?placeId=xxx
router.get('/place-details', locationController.placeDetails)

// GET /api/location/nearby?placeId=xxx
router.get('/nearby', locationController.nearby)

// GET /api/location/tenders?placeId=xxx  <- main endpoint the frontend uses
router.get('/tenders', locationController.tendersByLocation)

module.exports = router