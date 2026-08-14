const express = require('express')
const router = express.Router()
const {
  getBidderApplications,
  approveBidderApplication,
  rejectBidderApplication,
  finalizeBidders,
  getFinalBidderApplicationDetails,
  streamFinalBidderFile,
} = require('../controllers/finalBidderController')
const authMiddleware = require('../middleware/authMiddleware')

router.use(authMiddleware)

router.get('/by-tender/:tenderCode', getBidderApplications)
router.get('/by-tender/:tenderCode/application/:applicationId', getFinalBidderApplicationDetails)
router.patch('/:id/approve', approveBidderApplication)
router.patch('/:id/reject', rejectBidderApplication)
router.patch('/tender/:tenderCode/finalize', finalizeBidders)
router.get('/file/:fileId', streamFinalBidderFile)

module.exports = router