// src/models/Role.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'public',
        'department_employee',
        'department_head',
        'administrator',
        'financial',
        'tender_authority',
      ],
    },
    displayName: { type: String, required: true },
    description: { type: String, trim: true },
    permissionIds: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Role', roleSchema)