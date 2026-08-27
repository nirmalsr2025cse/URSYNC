// src/controllers/searchResourcesController.js
//
// Read-side controller backing SearchResourcePage.jsx (and any other page
// that needs to list/search/view Resources created via AddResources.jsx).
//
// Only exposes available, non-deleted resources to the search endpoints —
// allocated (available:false) or soft-deleted resources should never show
// up in the public search/browse flow.
//
// IMPORTANT: this requires the Department and District models to already
// be registered with Mongoose (i.e. required somewhere during app
// startup) before this controller runs, otherwise `.populate()` below
// throws MissingSchemaError and every request here 500s.
//
// `category` and `rentPerDay` are now real fields on the Resource model
// (see models/Resource.js) — formatResource() below reads them directly
// instead of stubbing them out.
const Resource = require('../models/Resource')

// GET /api/search-resources?q=jcb
// If `q` is empty/omitted, returns all available resources (matches the
// frontend's "no query → show everything" behavior).
exports.searchResources = async (req, res) => {
  try {
    const q = (req.query.q || '').trim()

    const baseFilter = { available: true, isDeleted: false }

    let filter = baseFilter
    if (q) {
      const regex = new RegExp(q, 'i')
      filter = {
        ...baseFilter,
        $or: [
          { resourceId: regex },
          { resourceName: regex },
          { category: regex },
          { description: regex },
          { specifications: regex },
          { location: regex },
        ],
      }
    }

    const resources = await Resource.find(filter)
      .populate('departmentId', 'name')
      .populate('districtId', 'name')
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ resources: resources.map(formatResource) })
  } catch (err) {
    console.error('searchResources error:', err)
    return res.status(500).json({ message: err.message || 'Failed to search resources' })
  }
}

// GET /api/search-resources/:id  (id = Mongo _id OR human-readable resourceId like "RS-001")
exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params

    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id, isDeleted: false }
      : { resourceId: id, isDeleted: false }

    const resource = await Resource.findOne(query)
      .populate('departmentId', 'name')
      .populate('districtId', 'name')
      .lean()

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' })
    }

    return res.json({ resource: formatResource(resource) })
  } catch (err) {
    console.error('getResourceById error:', err)
    return res.status(500).json({ message: err.message || 'Failed to fetch resource' })
  }
}

// Shapes a Resource doc into the flat fields SearchResourceCard.jsx
// expects (name, id, category, district, owner, dailyRate, quantity,
// specs, available). `category` and `dailyRate` now come straight from
// the schema (see models/Resource.js) — no more stub fallbacks.
function formatResource(doc) {
  return {
    _id: doc._id,
    id: doc.resourceId,
    name: doc.resourceName,
    category: doc.category,
    district: doc.districtId?.name || '—',
    owner: doc.departmentId?.name || '—',
    dailyRate: doc.rentPerDay,
    quantity: doc.quantity,
    specs: doc.specifications,
    description: doc.description,
    condition: doc.condition,
    location: doc.location,
    contactPerson: doc.contactPerson,
    available: doc.available,
    createdAt: doc.createdAt,
  }
}