// src/controllers/resourceController.js
//
// POST /api/resources -> creates a Resource document from the
// AddResources.jsx form. `available` is always set to true on creation.
// `resourceId` (RS-001, RS-002, ...) is generated server-side using an
// atomic counter (see models/Counter.js) so concurrent submissions from
// two different logins never collide.
//
// GET /api/resources/districts -> list of active districts, for the
// District dropdown on AddResources.jsx (there was no /districts route
// anywhere in app.js, so it's added here instead of a brand new route
// file, since resourceRoutes.js is already mounted at /api/resources).
//
// GET /api/resources/department -> the CURRENT LOGGED-IN USER's own
// department name/id, resolved server-side from req.departmentId
// (set by authMiddleware from the DB). This is what fixes the Department
// field showing a raw ObjectId string instead of the department name.
//
// The frontend's Department field is fixed/read-only ("Public Works
// Department"), so the department is resolved server-side from the
// authenticated user (req.departmentId, set by authMiddleware from the
// DB) rather than trusted from the request body — this also means a
// department_head can only ever create resources for their own
// department, even if the client were tampered with.
const mongoose = require('mongoose')
const Resource = require('../models/Resource')
const District = require('../models/District')
const Department = require('../models/Department')
const { getNextSequence } = require('../models/Counter')

const PHONE_REGEX = /^[6-9]\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONDITIONS = ['Good', 'Average', 'Bad']

// How many digits to zero-pad the running number to: 1 -> "001".
// Once the sequence exceeds this width (e.g. hits 1000), it just grows
// naturally to "RS-1000" instead of truncating anything.
const RESOURCE_ID_PAD_WIDTH = 3
const RESOURCE_ID_PREFIX = 'RS-'

// A resourceId collision here would only ever happen if two different
// counter values somehow produced the same string, which cannot occur
// with a monotonically increasing $inc — but Resource.resourceId also
// has a unique index as a hard backstop, and createResource retries a
// couple of times on that specific error just in case the counter
// document is ever manually reset/tampered with.
const MAX_RESOURCE_ID_RETRIES = 3

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

function formatResourceId(seq) {
  const padded = String(seq).padStart(RESOURCE_ID_PAD_WIDTH, '0')
  return `${RESOURCE_ID_PREFIX}${padded}`
}

// GET /api/resources/districts
// Returns [{ _id, name }] for every active district — used to populate
// the District <select> on AddResources.jsx.
async function getDistricts(req, res) {
  try {
    const districts = await District.find({ isActive: true })
      .select('_id name')
      .sort({ name: 1 })
    return res.status(200).json({ districts })
  } catch (err) {
    console.error('getDistricts error:', err)
    return res.status(500).json({ message: 'Failed to load districts.' })
  }
}

// GET /api/resources/department
// Returns the logged-in user's own department ({ id, name, code }),
// resolved from req.departmentId (never trusted from the client). Fixes
// the Department field on AddResources.jsx, which was previously showing
// the raw ObjectId because the frontend only had that ID, not the name.
async function getMyDepartment(req, res) {
  try {
    if (!req.departmentId) {
      return res.status(200).json({ department: null })
    }
    const dept = await Department.findOne({ _id: req.departmentId, isActive: true })
      .select('_id name code')
    if (!dept) {
      return res.status(200).json({ department: null })
    }
    return res.status(200).json({
      department: { id: dept._id, name: dept.name, code: dept.code },
    })
  } catch (err) {
    console.error('getMyDepartment error:', err)
    return res.status(500).json({ message: 'Failed to load department.' })
  }
}

// POST /api/resources
// Body: {
//   resourceName, districtId, quantity, condition, description,
//   specifications, contactPerson: { name, phone, email }, location
// }
async function createResource(req, res) {
  try {
    if (!req.departmentId) {
      return res.status(400).json({ message: 'Your account has no department assigned.' })
    }

    const {
      resourceName,
      districtId,
      quantity,
      condition,
      description,
      specifications,
      contactPerson,
      location,
    } = req.body

    // ── Presence / format validation ──────────────────────────────────
    const trimmedResourceName = typeof resourceName === 'string' ? resourceName.trim() : ''
    if (!trimmedResourceName) {
      return res.status(400).json({ message: 'Resource name is required.' })
    }

    if (!districtId || !isValidObjectId(districtId)) {
      return res.status(400).json({ message: 'Select a valid district.' })
    }

    const qty = Number(quantity)
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Enter a valid quantity.' })
    }

    if (!CONDITIONS.includes(condition)) {
      return res.status(400).json({ message: 'Condition must be Good, Average, or Bad.' })
    }

    const trimmedDescription = typeof description === 'string' ? description.trim() : ''
    if (!trimmedDescription) {
      return res.status(400).json({ message: 'Description is required.' })
    }

    const trimmedSpecifications = typeof specifications === 'string' ? specifications.trim() : ''
    if (!trimmedSpecifications) {
      return res.status(400).json({ message: 'Specifications are required.' })
    }

    const trimmedLocation = typeof location === 'string' ? location.trim() : ''
    if (!trimmedLocation) {
      return res.status(400).json({ message: 'Exact location is required.' })
    }

    if (!contactPerson || typeof contactPerson !== 'object') {
      return res.status(400).json({ message: 'Contact person details are required.' })
    }
    const contactName = typeof contactPerson.name === 'string' ? contactPerson.name.trim() : ''
    const contactPhone = typeof contactPerson.phone === 'string' ? contactPerson.phone.trim() : ''
    const contactEmail = typeof contactPerson.email === 'string' ? contactPerson.email.trim().toLowerCase() : ''

    if (!contactName) {
      return res.status(400).json({ message: 'Contact person name is required.' })
    }
    if (!PHONE_REGEX.test(contactPhone)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit contact phone number.' })
    }
    if (!EMAIL_REGEX.test(contactEmail)) {
      return res.status(400).json({ message: 'Enter a valid contact email address.' })
    }

    // ── District allow-list check ──────────────────────────────────────
    const districtDoc = await District.findOne({ _id: districtId, isActive: true })
    if (!districtDoc) {
      return res.status(400).json({ message: 'Select a valid, active district.' })
    }

    // ── Create, with a resourceId generated from an atomic counter ─────
    // getNextSequence('resource') is a single findOneAndUpdate($inc) on
    // the Counter collection, which MongoDB executes atomically. If two
    // department heads (different logins) submit at the same instant,
    // MongoDB still hands out two distinct sequence numbers (e.g. 41 and
    // 42) — there is no read-then-write gap where both could read the
    // same "current count", unlike a naive `countDocuments() + 1`
    // approach, which would be vulnerable to exactly that race.
    let resource
    let lastErr
    for (let attempt = 0; attempt < MAX_RESOURCE_ID_RETRIES; attempt++) {
      const seq = await getNextSequence('resource')
      const resourceId = formatResourceId(seq)
      try {
        resource = await Resource.create({
          resourceId,
          resourceName: trimmedResourceName,
          departmentId: req.departmentId, // resolved from the logged-in user, never from the client
          districtId: districtDoc._id,
          quantity: qty,
          condition,
          description: trimmedDescription,
          specifications: trimmedSpecifications,
          contactPerson: {
            name: contactName,
            phone: contactPhone,
            email: contactEmail,
          },
          location: trimmedLocation,
          available: true,
          createdBy: req.user._id,
        })
        lastErr = null
        break
      } catch (err) {
        // 11000 = MongoDB duplicate key error. Should only be reachable
        // if the counter document was reset/tampered with out-of-band.
        // Retry with a freshly-incremented sequence rather than failing
        // the whole request outright.
        if (err.code === 11000 && err.keyPattern?.resourceId) {
          lastErr = err
          continue
        }
        throw err
      }
    }
    if (!resource) {
      throw lastErr || new Error('Failed to generate a unique resource ID.')
    }

    const populated = await resource.populate([
      { path: 'departmentId', select: 'name code' },
      { path: 'districtId', select: 'name' },
    ])

    return res.status(201).json({
      message: 'Resource added successfully.',
      resource: {
        id: populated._id,
        resourceId: populated.resourceId,
        resourceName: populated.resourceName,
        department: populated.departmentId?.name || '-',
        district: populated.districtId?.name || '-',
        quantity: populated.quantity,
        condition: populated.condition,
        description: populated.description,
        specifications: populated.specifications,
        contactPerson: populated.contactPerson,
        location: populated.location,
        available: populated.available,
        createdAt: populated.createdAt,
      },
    })
  } catch (err) {
    console.error('createResource error:', err)
    return res.status(500).json({ message: 'Failed to add resource. Please try again.' })
  }
}

module.exports = { createResource, getDistricts, getMyDepartment }