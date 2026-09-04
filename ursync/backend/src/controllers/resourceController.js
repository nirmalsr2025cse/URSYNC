// src/controllers/resourceController.js
//
// Backend logic for resource listing, requests, and approval decisions.
const mongoose = require('mongoose')
const Resource = require('../models/Resource')
const ResourceRequest = require('../models/ResourceRequest')
const Department = require('../models/Department')
const District = require('../models/District')

// ── Helpers ────────────────────────────────────────────────────────────

// Recompute `booked` from the applications array so it can never drift
// out of sync (e.g. if an approval is later reversed).
function recomputeBooked(resource) {
  resource.booked = resource.applications.filter(a => a.status === 'Approved').length
}

// ── Admin / general listing ────────────────────────────────────────────

// GET /api/resources
// Simple active-resource listing for the search/apply page. Does NOT
// expose other users' applications — only aggregate counts.
async function listResources(req, res) {
  try {
    const resources = await Resource.find({
      isDeleted: false,
      isActive: true,
      available: { $gt: 0 },
    })
      .select('name description category district departmentId available booked createdAt')
      .populate('district', 'name code')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true })

    res.json({ resources })
  } catch (err) {
    console.error('listResources error:', err)
    res.status(500).json({ message: 'Failed to load resources.' })
  }
}

// GET /api/resources/:id
async function getResourceById(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid resource id.' })
    }

    const resource = await Resource.findOne({ _id: id, isDeleted: false })
      .select('name description category district departmentId available booked createdAt')
      .populate('district', 'name code')
      .populate('departmentId', 'name code')
      .lean({ virtuals: true })

    if (!resource) return res.status(404).json({ message: 'Resource not found.' })

    res.json({ resource })
  } catch (err) {
    console.error('getResourceById error:', err)
    res.status(500).json({ message: 'Failed to load resource.' })
  }
}

// POST /api/resources
// Admin-only creation (guard with a role check in the route/middleware).
async function createResource(req, res) {
  try {
    const {
      name,
      resourceName,
      description,
      category,
      district,
      districtId,
      departmentId,
      quantity,
      available,
    } = req.body

    const resourceLabel = name || resourceName
    const resourceQuantity = available ?? quantity

    if (!resourceLabel || resourceQuantity === undefined || resourceQuantity === null) {
      return res.status(400).json({ message: 'name and available are required.' })
    }
    if (Number.isNaN(Number(resourceQuantity)) || Number(resourceQuantity) < 0) {
      return res.status(400).json({ message: 'available cannot be negative.' })
    }

    const resource = await Resource.create({
      name: resourceLabel,
      description,
      category,
      district: district || districtId || null,
      departmentId: departmentId || req.departmentId || null,
      available: Number(resourceQuantity),
      booked: 0,
      applications: [],
      applied: [],
    })

    res.status(201).json({ resource })
  } catch (err) {
    console.error('createResource error:', err)
    res.status(500).json({ message: 'Failed to create resource.' })
  }
}

// ── Dropdown / prefill data for AddResources.jsx ───────────────────────

// GET /api/resources/department
// Returns the logged-in user's OWN department, so AddResources.jsx can
// show it read-only (a department employee/head always registers
// resources under their own department — never a client-picked one).
async function getMyDepartment(req, res) {
  try {
    if (!req.departmentId) {
      return res.status(200).json({ department: null, message: 'No department assigned.' })
    }

    const department = await Department.findById(req.departmentId).select('name code')
    if (!department) {
      return res.status(200).json({ department: null, message: 'No department assigned.' })
    }

    res.json({ department })
  } catch (err) {
    console.error('getMyDepartment error:', err)
    res.status(500).json({ message: 'Failed to load department.' })
  }
}

// GET /api/resources/districts
// Full district list for the "District" dropdown on AddResources.jsx.
async function listDistricts(req, res) {
  try {
    const districts = await District.find({}).select('name code').sort({ name: 1 })
    res.json({ districts })
  } catch (err) {
    console.error('listDistricts error:', err)
    res.status(500).json({ message: 'Failed to load districts.' })
  }
}

// ── Applying (waiting list) ─────────────────────────────────────────────

// POST /api/resources/:id/apply
// Body: { requiredFrom, requiredTo }
// Adds the requesting user to the resource's waiting list as a Pending
// application. Does NOT touch `booked` — that only changes on approval.
async function applyForResource(req, res) {
  try {
    const { id } = req.params
    const {
      requiredFrom,
      requiredTo,
      requiredQuantity = 1,
      applicantName,
      designation,
      department,
      organization,
      district,
      projectName,
      projectId,
      purpose,
      contactNumber,
      remarks = '',
    } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid resource id.' })
    }
    if (!requiredFrom || !requiredTo || !applicantName || !designation || !department ||
        !organization || !district || !projectName || !projectId || !purpose || !contactNumber) {
      return res.status(400).json({ message: 'All required resource request fields must be provided.' })
    }
    if (!Number.isInteger(Number(requiredQuantity)) || Number(requiredQuantity) < 1) {
      return res.status(400).json({ message: 'requiredQuantity must be at least 1.' })
    }

    const from = new Date(requiredFrom)
    const to = new Date(requiredTo)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      return res.status(400).json({ message: 'Invalid date range.' })
    }

    const resource = await Resource.findOne({ _id: id, isDeleted: false, isActive: true })
    if (!resource) return res.status(404).json({ message: 'Resource not found.' })

    if (Number(requiredQuantity) > resource.available - resource.booked) {
      return res.status(409).json({ message: 'The requested quantity is not available.' })
    }

    // Prevent the same user from stacking duplicate pending applications
    // for the same resource.
    const alreadyPending = resource.applications.some(
      a => a.userId.toString() === req.user._id.toString() && a.status === 'Pending'
    )
    if (alreadyPending) {
      return res.status(409).json({ message: 'You already have a pending request for this resource.' })
    }

    const resourceRequest = await ResourceRequest.create({
      resource: resource._id,
      resourceId: resource.resourceId || resource._id.toString(),
      resourceName: resource.name,
      departmentId: resource.departmentId || req.departmentId || null,
      requiredQuantity: Number(requiredQuantity),
      applicantName,
      designation,
      department,
      organization,
      district,
      projectName,
      projectId,
      purpose,
      requiredFrom: from,
      requiredTo: to,
      contactNumber,
      remarks,
      requestedBy: req.user._id,
    })

    resource.applications.push({
      userId: req.user._id,
      requestId: resourceRequest._id,
      requiredFrom: from,
      requiredTo: to,
      status: 'Pending',
    })

    resource.applied = resource.applied || []
    if (!resource.applied.some(userId => userId.toString() === req.user._id.toString())) {
      resource.applied.push(req.user._id)
    }

    await resource.save()

    const created = resource.applications[resource.applications.length - 1]
    res.status(201).json({ message: 'Request submitted.', requestId: resourceRequest._id })
  } catch (err) {
    console.error('applyForResource error:', err)
    res.status(500).json({ message: 'Failed to submit request.' })
  }
}

// GET /api/resource-requests/mine
// Flattens every application the logged-in user has made, across all
// resources, into the shape AppliedResourcesPage.jsx expects:
//   { _id, resourceId, resourceName, requiredFrom, requiredTo, status }
// Filtering happens server-side via req.user._id — a user can never see
// another user's applications.
async function getMyRequests(req, res) {
  try {
    const resources = await Resource.find({
      isDeleted: false,
      'applications.userId': req.user._id,
    })
      .select('name applications')
      .lean()

    const requests = []
    for (const resource of resources) {
      for (const app of resource.applications) {
        if (app.userId.toString() !== req.user._id.toString()) continue
        requests.push({
          _id: app._id,
          resourceId: resource._id,
          resourceName: resource.name,
          requiredFrom: app.requiredFrom,
          requiredTo: app.requiredTo,
          status: app.status,
        })
      }
    }

    // Most recently applied first.
    requests.sort((a, b) => new Date(b._id.getTimestamp()) - new Date(a._id.getTimestamp()))

    res.json({ requests })
  } catch (err) {
    console.error('getMyRequests error:', err)
    res.status(500).json({ message: 'Failed to load your applied resources.' })
  }
}

// ── Admin decisions (approve/reject) ───────────────────────────────────

// PATCH /api/resources/:id/applications/:appId
// Body: { status: 'Approved' | 'Rejected', remarks? }
// Admin-only (guard in route). Keeps `booked` in sync.
async function decideApplication(req, res) {
  try {
    const { id, appId } = req.params
    const { status, remarks } = req.body

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be Approved or Rejected.' })
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(appId)) {
      return res.status(400).json({ message: 'Invalid id.' })
    }

    const resource = await Resource.findOne({ _id: id, isDeleted: false })
    if (!resource) return res.status(404).json({ message: 'Resource not found.' })

    const application = resource.applications.id(appId)
    if (!application) return res.status(404).json({ message: 'Application not found.' })

    if (status === 'Approved' && resource.booked >= resource.available) {
      return res.status(409).json({ message: 'No units remaining to approve this request.' })
    }

    application.status = status
    application.remarks = remarks || ''
    application.decidedAt = new Date()
    application.decidedBy = req.user._id

    recomputeBooked(resource)
    await resource.save()

    if (application.requestId) {
      await ResourceRequest.findByIdAndUpdate(application.requestId, {
        status,
        remarks: application.remarks,
      })
    }

    res.json({ message: `Request ${status.toLowerCase()}.`, booked: resource.booked })
  } catch (err) {
    console.error('decideApplication error:', err)
    res.status(500).json({ message: 'Failed to update application.' })
  }
}

module.exports = {
  listResources,
  getResourceById,
  createResource,
  applyForResource,
  getMyRequests,
  decideApplication,
  getMyDepartment,
  listDistricts,
}