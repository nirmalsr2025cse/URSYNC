// src/routes/createTender.routes.js
const express = require('express')
const router = express.Router()

const {
  getTenders,
  getTenderById,
  createTender,
  updateTender,
  deleteTender,
} = require('../controllers/createTenderController')

// NOTE: adjust this import to match your actual auth middleware file/export name
const authMiddleware = require('../middleware/authMiddleware')

router.use(authMiddleware) // all routes below require a logged-in user (req.user)

router.route('/')
  .get(getTenders)
  .post(createTender)

router.route('/:id')
  .get(getTenderById)
  .put(updateTender)
  .delete(deleteTender)

module.exports = router