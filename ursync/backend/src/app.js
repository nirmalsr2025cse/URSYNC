// src/app.js
const express = require('express')
const cors = require('cors')
const tenderRoutes = require('./routes/tenderRoutes')
const authRoutes = require('./routes/authRoutes')
const locationRoutes = require('./routes/locationRoutes')

const app = express()
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  })
)
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' })) //Checks the serve works correctly

app.use('/api/tenders', tenderRoutes) // Main Part
app.use('/api/auth', authRoutes) //Authentication
app.use('/api/location', locationRoutes)//Tender By Location


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
