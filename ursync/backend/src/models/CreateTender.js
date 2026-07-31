// src/models/CreateTender.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const createTenderSchema = new Schema(
  {
    tenderId : {type: String, required: true , trim: true},
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    districtId: { type: Schema.Types.ObjectId, ref: 'District', required: true },

    location: { type: String, trim: true },
    taluk: { type: String, trim: true },
    village: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },

    estimatedValue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    duration: { type: String, trim: true },

    startDate: { type: Date },
    closingDate: { type: Date },

    tenderType: { type: String, trim: true, default: 'Open' },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },

    image: { type: String, trim: true },
    documentUrl: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    status: {
      type: String,
      enum: [
        'Draft',
        'Pending Approval',
        'Sent to Head',
        'Sent to Administrator',
        'Approved',
        'Rejected',
      ],
      default: 'Draft',
    },
    sentTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
)

// Explicitly bind to the existing "createtenders" collection
module.exports = mongoose.model('CreateTender', createTenderSchema, 'createtenders')