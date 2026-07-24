// src/models/Category.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ['Tender Category', 'Procurement Type'],
      default: 'Tender Category',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Category', categorySchema)
