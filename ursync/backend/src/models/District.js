// src/models/District.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const talukSchema = new Schema(
  {
    name: { type: String, required: true },
    villages: [{ type: String }],
  },
  { _id: false }
)

const districtSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    taluks: [talukSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('District', districtSchema)
