// src/routes/createTenderRoutes.js
const express = require('express')
const router = express.Router()

const {
  getFormMeta,
  getTenders,
  getTenderById,
  createTender,
  updateTender,
  deleteTender,
  sendToHead,
  sendToAdministrator,
} = require('../controllers/createTenderController')

const authMiddleware = require('../middleware/authMiddleware')

router.use(authMiddleware) // all routes below require a logged-in user (req.user)

// IMPORTANT: '/meta/form' must be declared BEFORE '/:id'. Express matches
// routes top-down, and '/:id' would otherwise greedily match "meta" as the
// :id param, causing this to 404 instead of ever reaching getFormMeta.
router.get('/meta/form', getFormMeta)

router.route('/')
  .get(getTenders)
  .post(createTender)

router.route('/:id')
  .get(getTenderById)
  .put(updateTender)
  .delete(deleteTender)

// State-transition actions — kept separate from the generic PUT so "Save"
// can never accidentally change status/sentTo (see updateTender's comment).
router.patch('/:id/send-to-head', sendToHead)
router.patch('/:id/send-to-administrator', sendToAdministrator)

module.exports = router