//src/app.js
const express = require('express')
const cors = require('cors')
const path = require('path')
const tenderRoutes = require('./routes/tenderRoutes')
const tenderListRoutes = require('./routes/tenderListRoutes') // NEW — Applications tab bar (Open/Upcoming/Completed)
const authRoutes = require('./routes/authRoutes')
const locationRoutes = require('./routes/locationRoutes')
const debarmentRoutes = require('./routes/debarmentRoutes') // NEW
const createTenderRoutes = require('./routes/createTenderRoutes') 
const reportsFeedbacksRoutes = require('./routes/reportsFeedbacksRoutes') // NEW
const approvementRoutes = require('./routes/approvementRoutes') // NEW
const createTenderApprovalRoutes = require('./routes/createTenderApprovalRoutes') // NEW
const publicTenderRoutes = require('./routes/publicTenderRoutes') // NEW 
const applyTenderRoutes = require('./routes/applyTenderRoutes') // NEW
const tempBidderApplicationRoutes = require('./routes/tempBidderApplicationRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const appliedTenderRoutes = require('./routes/appliedTenderRoutes')
const finalBidderRoutes = require('./routes/finalBidderRoutes')
const approvedRoutes = require('./routes/approvedRoutes')
const applicationApplicantsRoutes = require('./routes/applicationApplicantsRoutes')

const app = express()
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  })
)

app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body // Buffer, needed for signature verification
    next()
  }
)

app.use(express.json())

app.use(
  '/temp-uploads',
  express.static(path.join(__dirname, '..', 'uploads', 'temp'))
)

app.get('/api/health', (req, res) => res.json({ status: 'ok' })) //Checks the serve works correctly

// IMPORTANT: tenderListRoutes MUST be mounted before tenderRoutes.
// tenderRoutes has a `GET /:id` route — if it's registered first, Express
// matches top-down and `/api/tenders/applications` gets swallowed by that
// `:id` param (treating "applications" as a tender id) before it ever
// reaches tenderListRoutes, producing a 404 "Tender not found".
app.use('/api/tenders', tenderListRoutes) // NEW — Applications tab bar, must come first
app.use('/api/tenders', tenderRoutes) // Main Part
app.use('/api/auth', authRoutes) //Authentication
app.use('/api/location', locationRoutes)//Tender By Location
app.use('/api/debarments', debarmentRoutes) // NEW — Debarment List page
app.use('/api/create-tenders', createTenderRoutes)
app.use('/api/reports-feedbacks', reportsFeedbacksRoutes) // NEW — Reports & Feedbacks page
app.use('/api/approvement', approvementRoutes) // NEW — Approvement page
app.use('/api/create-tender-approval', createTenderApprovalRoutes) // NEW — Create Tender Approval page
app.use('/api/public-tenders', publicTenderRoutes) // NEW — Public Tenders page
app.use('/api/apply-tenders', applyTenderRoutes) // NEW — Apply Tenders page
app.use('/api/temp-applications', tempBidderApplicationRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/applied-tenders', appliedTenderRoutes) // NEW — Applied Tenders page
app.use('/api/finalbidders', finalBidderRoutes)
app.use('/api/approvement', approvedRoutes)
app.use('/api/tenders/applications/applicants', applicationApplicantsRoutes) // NEW — Application Applicants page


// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Internal server error' })
})

module.exports = app