// src/models/User.js
// Matches the ACTUAL fields already in the URSYNC.users collection:
// fullName, email, phone, passwordHash, roleId (ref), departmentId (ref,
// nullable), district (ref), status, emailVerified, isDeleted, timestamps.
const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },

    // bcrypt hash — select:false so it's never returned unless explicitly
    // requested with .select('+passwordHash')
    passwordHash: { type: String, required: true, select: false },

    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    district: { type: Schema.Types.ObjectId, ref: 'District', default: null },

    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended', 'PendingVerification'],
      default: 'PendingVerification',
    },
    emailVerified: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
)

module.exports = mongoose.model('User', userSchema)