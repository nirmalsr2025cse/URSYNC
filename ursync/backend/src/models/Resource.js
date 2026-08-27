// src/models/Resource.js
//
// Backs the AddResources.jsx form. One document per submitted resource.
//
// `available` is always created as `true` — it's the flag other features
// (e.g. Resource Sharing) will flip to `false` once a resource has been
// allocated/claimed elsewhere. This form never sets it to anything but
// true on creation.
//
// `resourceId` (e.g. "RS-001") is a human-readable, sequential ID
// generated server-side via the Counter collection (see
// models/Counter.js). It is NEVER computed from
// `await Resource.countDocuments()` — that approach is not safe under
// concurrent requests: two users submitting at the same instant could
// both read the same count and both compute the same next ID. Instead
// the controller calls `getNextSequence('resource')`, which uses an
// atomic $inc on a dedicated counter document, guaranteeing every
// request gets a distinct, gapless-ish sequence number even when many
// requests arrive simultaneously from different logins.
//
// `category` (Heavy / Medium / Low) and `rentPerDay` were added to
// support the Search Resource page's card display (category icon +
// daily rate), which previously had to fall back to stub values since
// neither field existed on this schema.
const mongoose = require('mongoose')
const { Schema } = mongoose

const contactPersonSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
)

const resourceSchema = new Schema(
  {
    // Human-readable sequential ID, e.g. "RS-001". Generated server-side
    // in the controller via Counter.getNextSequence — unique + indexed
    // so a duplicate (should never happen, but just in case) fails loud
    // instead of silently colliding.
    resourceId: { type: String, required: true, unique: true, index: true },

    resourceName: { type: String, required: true, trim: true },

    // Weight/impact classification for the resource, chosen on the form
    // via a dropdown. Used by the Search Resource page for the category
    // icon/badge.
    category: { type: String, enum: ['Heavy', 'Medium', 'Low'], required: true },

    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    districtId: { type: Schema.Types.ObjectId, ref: 'District', required: true },

    quantity: { type: Number, required: true, min: 1 },
    condition: { type: String, enum: ['Good', 'Average', 'Bad'], required: true },

    // Rent charged per day for this resource, in rupees. Shown as
    // "Daily Rate" on the Search Resource cards.
    rentPerDay: { type: Number, required: true, min: 0 },

    description: { type: String, required: true, trim: true },
    specifications: { type: String, required: true, trim: true },

    contactPerson: { type: contactPersonSchema, required: true },

    // Free-text exact location (address / landmark / site name) — not a
    // ref, since this is meant to pinpoint something more specific than
    // the district (e.g. "Behind Govt Hospital, Anna Nagar").
    location: { type: String, required: true, trim: true },

    // true on creation always. Flip to false elsewhere once allocated.
    available: { type: Boolean, default: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

resourceSchema.index({ departmentId: 1, available: 1 })
resourceSchema.index({ districtId: 1, available: 1 })
resourceSchema.index({ category: 1, available: 1 })

module.exports = mongoose.model('Resource', resourceSchema)