// src/server.js
require('dotenv').config()
const app = require('./app')
const connectDB = require('./config/db')
const startApplicationStatusCron = require('./jobs/applicationStatusCron')
const cron = require('node-cron')
const cleanupTempApplications = require('./jobs/cleanupTempApplications')

const PORT = process.env.PORT || 5000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    startApplicationStatusCron()
    cron.schedule('0 * * * *', () => {
      cleanupExpiredTempApplications().catch(console.error)
    })
  })
})