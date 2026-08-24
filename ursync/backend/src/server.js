// src/server.js
require('dotenv').config()
const app = require('./app')
const connectDB = require('./config/db')
const startApplicationStatusCron = require('./jobs/applicationStatusCron')
const startOngoingStatusCron = require('./jobs/updateOngoingStatusCron')
const cron = require('node-cron')
const { cleanupExpiredTempApplications } = require('./jobs/cleanupTempApplications')

const PORT = process.env.PORT || 5000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    startApplicationStatusCron()
    startOngoingStatusCron()
    cron.schedule('0 * * * *', () => {
      cleanupExpiredTempApplications().catch(console.error)
    })
  })
})