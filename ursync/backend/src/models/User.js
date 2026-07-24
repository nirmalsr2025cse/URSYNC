// src/models/User.js
//
// Only create/modify this if your existing model doesn't already match
// this shape. Do not rename the collection — Mongoose will pluralize
// "User" to "users" by default, matching your existing collection.

const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // never returned by default
    role: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  },
  { timestamps: true }
)

module.exports = mongoose.models.User || mongoose.model('User', userSchema)