// src/models/Counter.js
//
// Generic atomic counter collection used to generate sequential,
// human-readable IDs (e.g. RS-001, RS-002...) without race conditions
// when two users submit at the same time.
//
// Why this is concurrency-safe:
// MongoDB's findOneAndUpdate with $inc is a single atomic operation at
// the document level. Even if two requests hit this at the exact same
// millisecond, MongoDB serializes the two updates internally — one
// request will always get seq=41 and the other seq=42, never the same
// number twice. This holds true across multiple app server instances
// too, since the atomicity guarantee is enforced by MongoDB itself, not
// by application-level locking.
const mongoose = require('mongoose')
const { Schema } = mongoose

const counterSchema = new Schema({
  _id: { type: String, required: true }, // e.g. "resource"
  seq: { type: Number, default: 0 },
})

const Counter = mongoose.model('Counter', counterSchema)

// Returns the next sequence number for the given counter name.
// Creates the counter doc on first use (upsert: true).
async function getNextSequence(name) {
  const result = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return result.seq
}

module.exports = { Counter, getNextSequence }