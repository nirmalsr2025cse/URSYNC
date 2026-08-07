// src/config/gridfs.js
//
// Single shared GridFS bucket for all bidder-uploaded documents/signatures.
// GridFS automatically creates and manages two collections in MongoDB:
//   - bidderDocuments.files   (metadata: filename, length, contentType, uploadDate)
//   - bidderDocuments.chunks  (binary data, split into <=255KB chunks per file)
// You do NOT create these manually — the driver creates them on first upload.

const mongoose = require('mongoose')

let bucket = null

function getBucket() {
  if (!bucket) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection not ready — cannot get GridFS bucket yet.')
    }
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'bidderDocuments',
    })
  }
  return bucket
}

// Upload a Buffer (from multer memoryStorage) into GridFS and resolve the new fileId.
//
// `metadata` is stored on the bidderDocuments.files document itself (the
// `metadata` field is a free-form object GridFS reserves exactly for this),
// so every file record carries who uploaded it and for which tender —
// without needing a second lookup collection. Pass at minimum:
//   { userId, tenderId, label, originalName }
function uploadBufferToGridFS(buffer, filename, contentType, metadata = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(filename, {
      contentType,
      metadata,
    })
    uploadStream.end(buffer)
    uploadStream.on('error', reject)
    uploadStream.on('finish', () => resolve(uploadStream.id))
  })
}

// Delete a file from GridFS by its _id. Safe to call with null/undefined,
// and safe to call on an id that no longer exists (already deleted).
function deleteGridFSFileSafe(fileId) {
  if (!fileId) return
  getBucket().delete(fileId, (err) => {
    if (err) {
      // ENOENT-style "already gone" errors are fine to swallow; log others.
      console.warn('[gridfs] delete warning for', fileId?.toString?.(), err.message)
    }
  })
}

module.exports = { getBucket, uploadBufferToGridFS, deleteGridFSFileSafe }