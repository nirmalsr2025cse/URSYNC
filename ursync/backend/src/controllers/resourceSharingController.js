// src/controllers/resourceSharingController.js
//
// Backs the Resource Sharing page — Available / Not Available tabs only.
// Reads from the same `Resource` collection that AddResources.jsx writes
// to (see models/Resource.js). "Available" tab === available: true,
// "Not Available" tab === available: false. Both exclude soft-deleted
// docs (isDeleted: true).
const Resource = require('../models/Resource')

/* ---------------------------------------------------------------- */
/* helpers                                                           */
/* ---------------------------------------------------------------- */

// Shapes a Mongo Resource doc into the flat object the frontend
// (ResourceCard / ResourceDetailModal / EditResourceModal) expects.
// departmentId/districtId are populated refs, so we pull `.name` off
// them; if population failed for any reason we fall back gracefully
// instead of throwing.
function toClientShape(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: o.resourceId,
    _id: o._id,
    name: o.resourceName,
    department: o.departmentId?.name || '—',
    district: o.districtId?.name || '—',
    quantity: o.quantity,
    unit: 'Unit', // Resource model has no unit field yet; default until added
    condition: o.condition,
    description: o.description,
    specifications: o.specifications,
    location: o.location,
    contactPerson: o.contactPerson?.name,
    contactPhone: o.contactPerson?.phone,
    contactEmail: o.contactPerson?.email,
    status: o.available ? 'Available' : 'Not Available',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

function buildSearchFilter(q) {
  if (!q) return {}
  const rx = new RegExp(q, 'i')
  return { $or: [{ resourceName: rx }, { resourceId: rx }, { location: rx }] }
}

/* ---------------------------------------------------------------- */
/* GET /api/resource-sharing/available                               */
/* GET /api/resource-sharing/unavailable                             */
/* ---------------------------------------------------------------- */

async function listByAvailability(req, res, available) {
  try {
    const { search = '', page = 1, limit = 6 } = req.query
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.max(1, parseInt(limit, 10) || 6)

    const filter = {
      available,
      isDeleted: false,
      ...buildSearchFilter(search.trim()),
    }

    const [docs, total] = await Promise.all([
      Resource.find(filter)
        .populate('departmentId', 'name')
        .populate('districtId', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Resource.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: docs.map(toClientShape),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch resources' })
  }
}

exports.getAvailableResources = (req, res) => listByAvailability(req, res, true)
exports.getUnavailableResources = (req, res) => listByAvailability(req, res, false)

/* ---------------------------------------------------------------- */
/* GET /api/resource-sharing/:resourceId                             */
/* ---------------------------------------------------------------- */

exports.getResourceById = async (req, res) => {
  try {
    const doc = await Resource.findOne({ resourceId: req.params.resourceId, isDeleted: false })
      .populate('departmentId', 'name')
      .populate('districtId', 'name')

    if (!doc) return res.status(404).json({ success: false, message: 'Resource not found' })
    res.json({ success: true, data: toClientShape(doc) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch resource' })
  }
}

/* ---------------------------------------------------------------- */
/* PATCH /api/resource-sharing/:resourceId                           */
/* Backs EditResourceModal's Save. Only fields the modal can edit    */
/* are accepted — everything else on the doc is left untouched.      */
/* ---------------------------------------------------------------- */

const EDITABLE_FIELDS = ['resourceName', 'quantity', 'condition', 'description', 'specifications', 'location']

exports.updateResource = async (req, res) => {
  try {
    const updates = {}
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }
    // frontend sends `name` not `resourceName` — map it
    if (req.body.name !== undefined) updates.resourceName = req.body.name

    if (req.body.contactPerson || req.body.contactPhone || req.body.contactEmail) {
      const existing = await Resource.findOne({ resourceId: req.params.resourceId })
      if (!existing) return res.status(404).json({ success: false, message: 'Resource not found' })
      updates.contactPerson = {
        name: req.body.contactPerson ?? existing.contactPerson.name,
        phone: req.body.contactPhone ?? existing.contactPerson.phone,
        email: req.body.contactEmail ?? existing.contactPerson.email,
      }
    }

    updates.updatedBy = req.user?._id || null

    const doc = await Resource.findOneAndUpdate(
      { resourceId: req.params.resourceId, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('departmentId', 'name')
      .populate('districtId', 'name')

    if (!doc) return res.status(404).json({ success: false, message: 'Resource not found' })
    res.json({ success: true, data: toClientShape(doc), message: 'Resource updated successfully' })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update resource' })
  }
}

/* ---------------------------------------------------------------- */
/* DELETE /api/resource-sharing/:resourceId                          */
/* Soft delete — matches the trash icon, Available tab only in the   */
/* UI, but enforced here too regardless of current availability.     */
/* ---------------------------------------------------------------- */

exports.deleteResource = async (req, res) => {
  try {
    const doc = await Resource.findOneAndUpdate(
      { resourceId: req.params.resourceId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: req.user?._id || null } },
      { new: true }
    )
    if (!doc) return res.status(404).json({ success: false, message: 'Resource not found' })
    res.json({ success: true, message: 'Resource deleted successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete resource' })
  }
}