// src/models/Document.js
const mongoose = require('mongoose')
const { Schema } = mongoose

const documentSchema = new Schema(
  {
    tenderId: { type: String, required: true, trim: true, index: true },
    createTenderId: { type: Schema.Types.ObjectId, ref: 'CreateTender', index: true, default: null },
    publishedTenderId: { type: Schema.Types.ObjectId, ref: 'Tender', index: true, default: null },
    fileName: { type: String, trim: true, default: 'tender_document.pdf' },
    fileUrl: { type: String, trim: true, required: true },
    contentType: { type: String, default: 'application/pdf' },
    fileSize: { type: Number, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    status: { type: String, default: 'Draft' },
    isApproved: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Document', documentSchema, 'documents')
