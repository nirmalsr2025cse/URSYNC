// src/controllers/resourceController.js
//
// Backend logic for resource listing, requests, and approval decisions.
const mongoose = require('mongoose')
const Resource = require('../models/Resource')
const ResourceRequest = require('../models/ResourceRequest')
const Department = require('../models/Department')
const District = require('../models/District')
const { Counter, getNextSequence } = require('../models/Counter')

function parseDateRange(requiredFrom, requiredTo) {
  if (!requiredFrom || !requiredTo) {
    return { valid: false, message: 'Please select both Required From and Required To dates.' }
  }

  const from = new Date(requiredFrom)
  const to = new Date(requiredTo)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { valid: false, message: 'Please select a valid date range.' }
  }
  if (from > to) {
    return { valid: false, message: 'Required From date cannot be after Required To date.' }
  }

  return { valid: true, from, to }
}

function formatDateForMessage(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function overlapQuery(resourceId, from, to, extra = {}) {
  return {
    resource: resourceId,
    ...extra,
    requiredFrom: { $lte: to },
    requiredTo: { $gte: from },
  }
}

// ── Admin / general listing ────────────────────────────────────────────

// GET /api/resources
// Simple active-resource listing for the search/apply page. Does NOT
// expose other users' applications — only aggregate counts.
async function listResources(req, res) {
  try {
    await expireResourceRequests()

    const { requiredFrom, requiredTo } = req.query
    let from = null
    let to = null
    if (requiredFrom || requiredTo) {
      const parsed = parseDateRange(requiredFrom, requiredTo)
      if (!parsed.valid) return res.status(400).json({ message: parsed.message })
      from = parsed.from
      to = parsed.to
    }

    const resources = await Resource.find({
      isDeleted: false,
      isActive: true,
    })
      .populate('district', 'name code')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true })

    const resourceMap = new Map(resources.map(resource => [resource._id.toString(), resource.available]))
    const availabilityMap = await calculateResourceAvailability(resourceMap, from, to)

    const data = resources.map(resource => {
      const avail = availabilityMap.get(resource._id.toString()) || {
        peakBooked: 0,
        availableQuantity: resource.available,
        dateVariations: [],
        approvedRequests: [],
      }
      return {
        ...resource,
        approvedQuantity: avail.peakBooked,
        availableQuantity: avail.availableQuantity,
        availableForDates: avail.availableQuantity > 0,
        dateVariations: avail.dateVariations,
        approvedRequests: avail.approvedRequests,
        availabilityMessage: from && to && avail.availableQuantity === 0
          ? 'No resources are available for the selected date range.'
          : null,
      }
    })

    res.json({ resources: data })
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
      condition,
      rentPerDay,
      specifications,
      contactPerson,
      contactName,
      contactPhone,
      contactEmail,
      location,
      unit,
    } = req.body

    const resourceLabel = name || resourceName
    const resourceQuantity = available ?? quantity

    if (!resourceLabel || resourceQuantity === undefined || resourceQuantity === null) {
      return res.status(400).json({ message: 'name and available are required.' })
    }
    if (Number.isNaN(Number(resourceQuantity)) || Number(resourceQuantity) < 0) {
      return res.status(400).json({ message: 'available cannot be negative.' })
    }

    const seq = await getNextSequence('resource')
    const resourceId = `RS-${String(seq).padStart(3, '0')}`

    const resource = await Resource.create({
      resourceId,
      name: resourceLabel,
      description: description || '',
      category: category || '',
      district: district || districtId || null,
      departmentId: departmentId || req.departmentId || null,
      available: Number(resourceQuantity),
      condition: condition || 'Good',
      rentPerDay: Number(rentPerDay) || 0,
      specifications: specifications || '',
      contactPerson: {
        name: contactPerson?.name || contactName || '',
        phone: contactPerson?.phone || contactPhone || '',
        email: contactPerson?.email || contactEmail || '',
      },
      location: location || '',
      unit: unit || 'units',
      applications: [],
      applied: [],
    })

    res.status(201).json({ resource })
  } catch (err) {
    console.error('createResource error:', err)
    res.status(500).json({ message: 'Failed to create resource.' })
  }
}

// PATCH / PUT /api/resources/:id
async function updateResource(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid resource id.' })
    }

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
      condition,
      rentPerDay,
      specifications,
      contactPerson,
      contactName,
      contactPhone,
      contactEmail,
      location,
      unit,
    } = req.body

    const resource = await Resource.findOne({ _id: id, isDeleted: false })
    if (!resource) return res.status(404).json({ message: 'Resource not found.' })

    if (name !== undefined || resourceName !== undefined) {
      resource.name = name || resourceName
    }
    if (description !== undefined) resource.description = description
    if (category !== undefined) resource.category = category
    if (district !== undefined || districtId !== undefined) {
      resource.district = district || districtId || null
    }
    if (departmentId !== undefined) resource.departmentId = departmentId
    if (quantity !== undefined || available !== undefined) {
      const q = available ?? quantity
      if (Number.isNaN(Number(q)) || Number(q) < 0) {
        return res.status(400).json({ message: 'available cannot be negative.' })
      }
      resource.available = Number(q)
    }
    if (condition !== undefined) resource.condition = condition
    if (rentPerDay !== undefined) resource.rentPerDay = Number(rentPerDay) || 0
    if (specifications !== undefined) resource.specifications = specifications
    if (location !== undefined) resource.location = location
    if (unit !== undefined) resource.unit = unit

    if (contactPerson || contactName !== undefined || contactPhone !== undefined || contactEmail !== undefined) {
      resource.contactPerson = {
        name: contactPerson?.name !== undefined ? contactPerson.name : (contactName !== undefined ? contactName : resource.contactPerson?.name || ''),
        phone: contactPerson?.phone !== undefined ? contactPerson.phone : (contactPhone !== undefined ? contactPhone : resource.contactPerson?.phone || ''),
        email: contactPerson?.email !== undefined ? contactPerson.email : (contactEmail !== undefined ? contactEmail : resource.contactPerson?.email || ''),
      }
    }

    await resource.save()

    const updated = await Resource.findById(resource._id)
      .populate('district', 'name code')
      .populate('departmentId', 'name code')
      .lean({ virtuals: true })

    res.json({ message: 'Resource updated successfully.', resource: updated })
  } catch (err) {
    console.error('updateResource error:', err)
    res.status(500).json({ message: 'Failed to update resource.' })
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
// Body: { requiredFrom, requiredTo, requiredQuantity, ... }
// Adds the requesting user's resource request with status 'Pending'.
// `available` is never modified. Date-range availability is calculated dynamically.
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
    const qty = Number(requiredQuantity)
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' })
    }

    const dateRange = parseDateRange(requiredFrom, requiredTo)
    if (!dateRange.valid) return res.status(400).json({ message: dateRange.message })
    const { from, to } = dateRange

    const resource = await Resource.findOne({ _id: id, isDeleted: false, isActive: true })
    if (!resource) return res.status(404).json({ message: 'Resource not found.' })

    if (qty > resource.available) {
      return res.status(400).json({ message: 'Requested quantity exceeds the total resource quantity.' })
    }

    const pendingRequest = await ResourceRequest.findOne(
      overlapQuery(resource._id, from, to, {
        requestedBy: req.user._id,
        status: 'Pending',
      })
    ).lean()
    if (pendingRequest) {
      return res.status(409).json({
        message: `You already have a pending request for this resource from ${formatDateForMessage(pendingRequest.requiredFrom)} to ${formatDateForMessage(pendingRequest.requiredTo)}.`,
      })
    }

    const approvedRequestByUser = await ResourceRequest.findOne(
      overlapQuery(resource._id, from, to, {
        requestedBy: req.user._id,
        status: 'Approved',
      })
    ).lean()
    if (approvedRequestByUser) {
      return res.status(409).json({
        message: `You already have an approved request for this resource from ${formatDateForMessage(approvedRequestByUser.requiredFrom)} to ${formatDateForMessage(approvedRequestByUser.requiredTo)}.`,
      })
    }

    const resourceMap = new Map([[resource._id.toString(), resource.available]])
    const availabilityMap = await calculateResourceAvailability(resourceMap, from, to)
    const avail = availabilityMap.get(resource._id.toString())
    const availableQuantity = avail ? avail.availableQuantity : resource.available
    if (qty > availableQuantity) {
      return res.status(409).json({
        message: `Only ${availableQuantity} resources are available for the selected date range.`,
      })
    }

    const resourceRequest = await ResourceRequest.create({
      resource: resource._id,
      resourceId: resource.resourceId || resource._id.toString(),
      resourceName: resource.name,
      departmentId: resource.departmentId || req.departmentId || null,
      requiredQuantity: qty,
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
      requiredQuantity: qty,
      requiredFrom: from,
      requiredTo: to,
      status: 'Pending',
    })

    resource.applied = resource.applied || []
    if (!resource.applied.some(userId => userId.toString() === req.user._id.toString())) {
      resource.applied.push(req.user._id)
    }

    await resource.save()

    res.status(201).json({ message: 'Request submitted.', requestId: resourceRequest._id })
  } catch (err) {
    console.error('applyForResource error:', err)
    res.status(500).json({ message: 'Failed to submit request.' })
  }
}

// GET /api/resource-requests/mine
// Returns requests from the dedicated resourcerequests collection.
async function getMyRequests(req, res) {
  try {
    const requests = await ResourceRequest.find({ requestedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean()

    res.json({ requests })
  } catch (err) {
    console.error('getMyRequests error:', err)
    res.status(500).json({ message: 'Failed to load your applied resources.' })
  }
}

// ── Admin decisions (approve/reject) ───────────────────────────────────

// PATCH /api/resources/:id/applications/:appId
// Body: { status: 'Approved' | 'Rejected', remarks? }
// Admin-only legacy route. Reservation availability is calculated from requests.
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

    if (status === 'Approved') {
      if (application.status !== 'Pending') {
        return res.status(409).json({ message: 'This application is no longer pending.' })
      }
      const resourceMap = new Map([[resource._id.toString(), resource.available]])
      const availabilityMap = await calculateResourceAvailability(
        resourceMap, application.requiredFrom, application.requiredTo, null, application.requestId
      )
      const avail = availabilityMap.get(resource._id.toString())
      const availableQuantity = avail ? avail.availableQuantity : resource.available
      if ((application.requiredQuantity || 1) > availableQuantity) {
        return res.status(409).json({ message: 'Cannot approve this request because there are not enough resources available for the selected date range.' })
      }
    }

    application.status = status
    application.remarks = remarks || ''
    application.decidedAt = new Date()
    application.decidedBy = req.user._id

    await resource.save()

    if (application.requestId) {
      await ResourceRequest.findByIdAndUpdate(application.requestId, {
        status,
        remarks: application.remarks,
      })
    }

    if (status === 'Rejected') {
      resource.applied = (resource.applied || []).filter(
        userId => userId.toString() !== application.userId.toString()
      )
      await resource.save()
    }

    res.json({ message: `Request ${status.toLowerCase()}.` })
  } catch (err) {
    console.error('decideApplication error:', err)
    res.status(500).json({ message: 'Failed to update application.' })
  }
}

module.exports = {
  listResources,
  listSharingResources,
  listResourceRequests,
  decideResourceRequest,
  expireResourceRequests,
  getResourceById,
  getResourceAvailability,
  createResource,
  updateResource,
  applyForResource,
  getMyRequests,
  decideApplication,
  getMyDepartment,
  listDistricts,
}

async function listSharingResources(req, res) {
  try {
    const { q, requiredFrom, requiredTo } = req.query
    let from = null
    let to = null
    if (requiredFrom || requiredTo) {
      const parsed = parseDateRange(requiredFrom, requiredTo)
      if (!parsed.valid) return res.status(400).json({ message: parsed.message })
      from = parsed.from
      to = parsed.to
    }

    const resourceFilter = { isDeleted: false, isActive: true }
    if (q?.trim()) {
      const search = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      resourceFilter.$or = [{ name: search }, { category: search }, { description: search }]
    }
    const resources = await Resource.find(resourceFilter)
      .populate('district', 'name code')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true })

    const resourceMap = new Map(resources.map(resource => [resource._id.toString(), resource.available]))
    const availabilityMap = await calculateResourceAvailability(resourceMap, from, to)

    res.json({
      resources: resources.map(resource => {
        const avail = availabilityMap.get(resource._id.toString()) || {
          peakBooked: 0,
          availableQuantity: resource.available,
          dateVariations: [],
          approvedRequests: [],
        }
        return {
          ...resource,
          approvedQuantity: avail.peakBooked,
          availableQuantity: avail.availableQuantity,
          availableForDates: avail.availableQuantity > 0,
          dateVariations: avail.dateVariations,
          approvedRequests: avail.approvedRequests,
          availabilityMessage: from && to && avail.availableQuantity === 0
            ? 'No resources are available for the selected date range.'
            : null,
        }
      }),
    })
  } catch (err) {
    console.error('listSharingResources error:', err)
    res.status(500).json({ message: 'Failed to load resources.' })
  }
}

async function expireResourceRequests() {
  const expiredPending = await ResourceRequest.find({
    status: 'Pending',
    requiredFrom: { $lte: new Date() },
  }).select('_id resource requestedBy')

  for (const request of expiredPending) {
    const updated = await ResourceRequest.findOneAndUpdate(
      { _id: request._id, status: 'Pending' },
      { $set: { status: 'Rejected', remarks: 'Request expired before approval.' } },
      { new: true }
    )
    if (!updated) continue

    await Resource.updateOne(
      { _id: request.resource },
      {
        $set: {
          'applications.$[application].status': 'Rejected',
          'applications.$[application].remarks': updated.remarks,
        },
        $pull: { applied: request.requestedBy },
      },
      { arrayFilters: [{ 'application.requestId': request._id }] }
    )
  }

  const completedRequests = await ResourceRequest.find({
    status: 'Approved',
    requiredTo: { $lt: startOfToday() },
  }).select('_id resource requestedBy requiredQuantity')

  for (const request of completedRequests) {
    const updated = await ResourceRequest.findOneAndUpdate(
      { _id: request._id, status: 'Approved' },
      { $set: { status: 'Completed', remarks: 'Resource returned after the required period.' } },
      { new: true }
    )
    if (!updated) continue

    const resource = await Resource.findById(request.resource)
    if (!resource) continue

    resource.applied = (resource.applied || []).filter(
      userId => userId.toString() !== request.requestedBy.toString()
    )

    const application = resource.applications.find(
      app => app.requestId?.toString() === request._id.toString()
    )
    if (application) {
      application.status = 'Completed'
      application.remarks = updated.remarks
      application.decidedAt = new Date()
    }

    await resource.save()
  }

  return expiredPending.length + completedRequests.length
}

async function listResourceRequests(req, res) {
  try {
    await expireResourceRequests()
    const requests = await ResourceRequest.find({}).sort({ createdAt: -1 }).lean()
    res.json({ requests })
  } catch (err) {
    console.error('listResourceRequests error:', err)
    res.status(500).json({ message: 'Failed to load resource requests.' })
  }
}

let standaloneDecisionQueue = Promise.resolve()

async function performResourceDecision(requestId, status, remarks, session) {
  const allowedStatuses = status === 'Approved' ? ['Pending'] : ['Pending', 'Approved']
  let requestQuery = ResourceRequest.findOne({ _id: requestId, status: { $in: allowedStatuses } })
  if (session) requestQuery = requestQuery.session(session)
  const request = await requestQuery
  if (!request) throw createHttpError(409, 'This request is no longer pending.')

  const quantity = request.requiredQuantity || 1
  const resourceQuery = Resource.findOne({ _id: request.resource, isDeleted: false })
  if (session) resourceQuery.session(session)
  const resource = await resourceQuery
  if (!resource) throw createHttpError(404, 'Resource not found.')

  if (status === 'Approved') {
    const resourceMap = new Map([[request.resource.toString(), resource.available]])
    const availabilityMap = await calculateResourceAvailability(
      resourceMap,
      request.requiredFrom,
      request.requiredTo,
      session,
      request._id
    )
    const avail = availabilityMap.get(request.resource.toString())
    const availableQuantity = avail ? avail.availableQuantity : resource.available
    if (quantity > availableQuantity) {
      throw createHttpError(409, 'Cannot approve this request because there are not enough resources available for the selected date range.')
    }
  }

  const updateOptions = { arrayFilters: [{ 'application.requestId': request._id }] }
  if (session) updateOptions.session = session
  await Resource.updateOne(
    { _id: request.resource },
    {
      $set: {
        'applications.$[application].status': status,
        'applications.$[application].remarks': remarks,
        'applications.$[application].decidedAt': new Date(),
      },
      ...(status === 'Rejected' ? { $pull: { applied: request.requestedBy } } : {}),
    },
    updateOptions
  )

  request.status = status
  request.remarks = remarks
  if (session) await request.save({ session })
  else await request.save()

  return { request, resource }
}

async function decideResourceRequest(req, res) {
  let session
  try {
    const { requestId } = req.params
    const { status, remarks = '' } = req.body
    if (!['Approved', 'Rejected'].includes(status) || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request decision.' })
    }

    await expireResourceRequests()
    const topologyType = mongoose.connection.getClient()?.topology?.description?.type
    const supportsTransactions = topologyType === 'ReplicaSet' || topologyType === 'Sharded'
    let response
    if (supportsTransactions) {
      session = await mongoose.startSession()
      await session.withTransaction(async () => {
        response = await performResourceDecision(requestId, status, remarks, session)
      })
    } else {
      const previous = standaloneDecisionQueue
      let release
      standaloneDecisionQueue = new Promise(resolve => { release = resolve })
      await previous
      try {
        response = await performResourceDecision(requestId, status, remarks)
      } finally {
        release()
      }
    }

    res.json({ message: `Request ${status.toLowerCase()}.`, ...response })
  } catch (err) {
    console.error('decideResourceRequest error:', err)
    res.status(err.statusCode || 500).json({ message: err.message || 'Failed to update resource request.' })
  } finally {
    if (session) await session.endSession()
  }
}

function createHttpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function calculateResourceAvailability(resourceMap, from, to, session, excludeRequestId = null) {
  const objectIds = Array.from(resourceMap.keys()).map(id =>
    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
  )

  const match = {
    resource: { $in: objectIds },
    status: 'Approved',
  }
  if (from && to) {
    match.requiredFrom = { $lte: to }
    match.requiredTo = { $gte: from }
  } else {
    match.requiredTo = { $gte: startOfToday() }
  }

  if (excludeRequestId) {
    match._id = {
      $ne: typeof excludeRequestId === 'string' ? new mongoose.Types.ObjectId(excludeRequestId) : excludeRequestId,
    }
  }

  let query = ResourceRequest.find(match)
    .select('resource requiredQuantity requiredFrom requiredTo applicantName projectName')
    .sort({ requiredFrom: 1 })
    .lean()
  if (session) query = query.session(session)
  const requests = await query

  const requestsByResource = new Map()
  for (const req of requests) {
    const rId = req.resource.toString()
    if (!requestsByResource.has(rId)) requestsByResource.set(rId, [])
    requestsByResource.get(rId).push(req)
  }

  const resultMap = new Map()

  for (const [rId, totalAvailable] of resourceMap.entries()) {
    const resourceRequests = requestsByResource.get(rId.toString()) || []

    if (from && to) {
      const windowStart = new Date(from)
      const windowEnd = new Date(to)
      windowStart.setHours(0, 0, 0, 0)
      windowEnd.setHours(23, 59, 59, 999)

      const boundaries = new Set()
      boundaries.add(windowStart.getTime())

      const dayAfterEnd = new Date(windowEnd)
      dayAfterEnd.setDate(dayAfterEnd.getDate() + 1)
      dayAfterEnd.setHours(0, 0, 0, 0)
      boundaries.add(dayAfterEnd.getTime())

      for (const req of resourceRequests) {
        const reqStart = new Date(req.requiredFrom)
        reqStart.setHours(0, 0, 0, 0)
        const reqEndNext = new Date(req.requiredTo)
        reqEndNext.setDate(reqEndNext.getDate() + 1)
        reqEndNext.setHours(0, 0, 0, 0)

        if (reqStart.getTime() > windowStart.getTime() && reqStart.getTime() < dayAfterEnd.getTime()) {
          boundaries.add(reqStart.getTime())
        }
        if (reqEndNext.getTime() > windowStart.getTime() && reqEndNext.getTime() < dayAfterEnd.getTime()) {
          boundaries.add(reqEndNext.getTime())
        }
      }

      const sortedTimes = Array.from(boundaries).sort((a, b) => a - b)
      let peakBooked = 0
      const intervals = []

      for (let i = 0; i < sortedTimes.length - 1; i++) {
        const intervalStart = new Date(sortedTimes[i])
        const intervalEnd = new Date(sortedTimes[i + 1] - 1)
        intervalEnd.setHours(23, 59, 59, 999)

        let bookedQuantity = 0
        const activeRequests = []
        for (const req of resourceRequests) {
          const reqStart = new Date(req.requiredFrom)
          reqStart.setHours(0, 0, 0, 0)
          const reqEnd = new Date(req.requiredTo)
          reqEnd.setHours(23, 59, 59, 999)

          if (reqStart <= intervalEnd && reqEnd >= intervalStart) {
            bookedQuantity += (req.requiredQuantity || 0)
            activeRequests.push(req)
          }
        }

        if (bookedQuantity > peakBooked) {
          peakBooked = bookedQuantity
        }

        const availableQty = Math.max(0, totalAvailable - bookedQuantity)
        intervals.push({
          from: intervalStart,
          to: intervalEnd,
          bookedQuantity,
          availableQuantity: availableQty,
          totalQuantity: totalAvailable,
          requests: activeRequests.map(r => ({
            id: r._id,
            applicantName: r.applicantName,
            projectName: r.projectName,
            quantity: r.requiredQuantity,
          })),
        })
      }

      const mergedVariations = []
      for (const interval of intervals) {
        if (
          mergedVariations.length > 0 &&
          mergedVariations[mergedVariations.length - 1].bookedQuantity === interval.bookedQuantity
        ) {
          mergedVariations[mergedVariations.length - 1].to = interval.to
        } else {
          mergedVariations.push({ ...interval })
        }
      }

      resultMap.set(rId.toString(), {
        peakBooked,
        availableQuantity: Math.max(0, totalAvailable - peakBooked),
        dateVariations: mergedVariations,
        approvedRequests: resourceRequests,
      })
    } else {
      const upcomingSchedule = resourceRequests.map(r => {
        const reqStart = new Date(r.requiredFrom)
        const reqEnd = new Date(r.requiredTo)
        const booked = r.requiredQuantity || 0
        return {
          from: reqStart,
          to: reqEnd,
          bookedQuantity: booked,
          availableQuantity: Math.max(0, totalAvailable - booked),
          totalQuantity: totalAvailable,
          applicantName: r.applicantName,
          projectName: r.projectName,
        }
      })

      resultMap.set(rId.toString(), {
        peakBooked: 0,
        availableQuantity: totalAvailable,
        dateVariations: upcomingSchedule,
        approvedRequests: resourceRequests,
      })
    }
  }

  return resultMap
}

async function getResourceAvailability(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid resource id.' })
    }
    const parsed = parseDateRange(req.query.requiredFrom, req.query.requiredTo)
    if (!parsed.valid) return res.status(400).json({ message: parsed.message })

    const resource = await Resource.findOne({ _id: id, isDeleted: false, isActive: true })
      .select('available')
      .lean()
    if (!resource) return res.status(404).json({ message: 'Resource not found.' })

    const resourceMap = new Map([[resource._id.toString(), resource.available]])
    const availabilityMap = await calculateResourceAvailability(resourceMap, parsed.from, parsed.to)
    const avail = availabilityMap.get(resource._id.toString()) || {
      peakBooked: 0,
      availableQuantity: resource.available,
      dateVariations: [],
      approvedRequests: [],
    }

    res.json({
      resourceId: resource._id,
      totalQuantity: resource.available,
      totalAvailable: resource.available,
      approvedQuantity: avail.peakBooked,
      remainingAvailable: avail.availableQuantity,
      availableQuantity: avail.availableQuantity,
      dateVariations: avail.dateVariations,
      approvedRequests: avail.approvedRequests,
    })
  } catch (err) {
    console.error('getResourceAvailability error:', err)
    res.status(500).json({ message: 'Failed to calculate resource availability.' })
  }
}