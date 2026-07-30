const express = require('express')
const router = express.Router()
const { getCancelledRetenderedTenders } = require('../controllers/cancelledRetenderedController')
router.get('/by-canclledRetenders', getCancelledRetenderedTenders)
module.exports = router