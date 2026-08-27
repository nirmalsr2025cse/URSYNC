// src/pages/ResourceSharing.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Pagination from '../components/Pagination'
import { useApi } from '../api/client'
import { RESOURCE_REQUESTS } from '../data/resourceSharingMockData'
// NOTE: AVAILABLE_RESOURCES / UNAVAILABLE_RESOURCES mocks are no longer
// imported — those two tabs are now backed by the resourceSharing API
// (src/controllers/resourceSharingController.js). RESOURCE_REQUESTS
// (Request / Approved / Rejected tabs) still uses mock data — no backend
// was built for that yet.

/* ─────────────────────── helpers ─────────────────────── */
const TABS = [
  { id: 'Available',     label: 'Available'     },
  { id: 'Not-Available', label: 'Not Available' },
  { id: 'Request',       label: 'Requests'      },
  { id: 'Approved',      label: 'Approved'      },
  { id: 'Rejected',      label: 'Rejected'      },
]

const URGENCY_STYLE = {
  High:   'bg-red-50 text-red-700 border border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  Low:    'bg-blue-50 text-blue-700 border border-blue-200',
}

const STATUS_STYLE = {
  Pending:  'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
}

const SEARCH_DEBOUNCE_MS = 350

/* Naive singular/plural helper for the unit label.
   Derives a singular base (strips a trailing "s" if present) then
   re-pluralizes based on the current quantity — so editing the
   Quantity field alone keeps "1 Unit" vs "5 Units" correct without a
   separate editable Unit box. */
function pluralizeUnit(unit, quantity) {
  if (!unit) return unit
  const n = Number(quantity)
  const singular = unit.endsWith('s') ? unit.slice(0, -1) : unit
  if (n === 1) return singular
  return singular.endsWith('s') ? singular : `${singular}s`
}

/* Formats a rupee amount for display, e.g. 1500 -> "₹1,500". Guards
   against undefined/null for any older resources created before the
   rentPerDay field existed. */
function formatRate(value) {
  if (value === undefined || value === null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `₹${n.toLocaleString('en-IN')}`
}

/* Category icon mapping */
function CategoryIcon({ category }) {
  const map = {
    'Heavy Machinery':       'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    'Road Construction':     'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    'Construction Equipment':'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    'Survey & Measurement':  'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    'Utilities':             'M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4',
    'Boring & Drilling':     'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
    'Power Equipment':       'M13 10V3L4 14h7v7l9-11h-7z',
    // New Heavy/Medium/Low category enum (see models/Resource.js). Kept
    // alongside the older named categories above so this icon map still
    // works for both the legacy mock data and the live Resource schema.
    'Heavy':  'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    'Medium': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    'Low':    'M13 10V3L4 14h7v7l9-11h-7z',
  }
  const d = map[category] || map['Heavy Machinery']
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  )
}

/* ─────────────────────── Toast ─────────────────────── */
function Toast({ toast }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className={[
      'fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-fade-in',
      isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ].join(' ')}>
      <span className={['w-2 h-2 rounded-full flex-shrink-0', isError ? 'bg-red-500' : 'bg-emerald-500'].join(' ')} />
      {toast.msg}
    </div>
  )
}

/* ─────────────────────── ResourceDetailModal ─────────────────────── */
function ResourceDetailModal({ resource, onClose, onEdit }) {
  if (!resource) return null
  const isAvailable = resource.status === 'Available'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-tn-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-tn-border">
          <div className="flex items-center gap-3">
            <div className={[
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
            ].join(' ')}>
              <CategoryIcon category={resource.category} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-tn-navy">{resource.name}</h2>
              <p className="text-xs text-tn-muted mt-0.5">{resource.id} · {resource.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={[
              'text-[10px] font-bold px-2.5 py-1 rounded-full border',
              isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
            ].join(' ')}>
              {resource.status}
            </span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-tn-border text-tn-muted hover:bg-tn-light transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Department',  value: resource.department },
              { label: 'District',    value: resource.district   },
              { label: 'Category',    value: resource.category || '—' },
              { label: 'Quantity',    value: `${resource.quantity} ${pluralizeUnit(resource.unit, resource.quantity)}` },
              { label: 'Condition',   value: resource.condition  },
              { label: 'Rent / Day',  value: formatRate(resource.rentPerDay) },
              ...(isAvailable
                ? [
                    { label: 'Available From', value: resource.availableFrom ? new Date(resource.availableFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                    { label: 'Available To',   value: resource.availableTo ? new Date(resource.availableTo).toLocaleDateString('en-IN',   { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  ]
                : [
                    { label: 'Expected Availability', value: resource.expectedAvailability ? new Date(resource.expectedAvailability).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  ]
              ),
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-tn-navy mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div className="bg-tn-cream rounded-xl p-4 border border-tn-border">
            <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-sm text-tn-navy leading-relaxed">{resource.description}</p>
          </div>
          <div className="bg-tn-cream rounded-xl p-4 border border-tn-border">
            <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide mb-1.5">Specifications</p>
            <p className="text-sm text-tn-navy leading-relaxed">{resource.specifications}</p>
          </div>
          {!isAvailable && resource.reason && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1.5">Reason for Unavailability</p>
              <p className="text-sm text-red-800 leading-relaxed">{resource.reason}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-tn-border p-4">
              <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide mb-2">Contact Person</p>
              <p className="text-sm font-semibold text-tn-navy">{resource.contactPerson}</p>
              <p className="text-xs text-tn-muted mt-1">{resource.contactPhone}</p>
              <p className="text-xs text-tn-blue mt-0.5">{resource.contactEmail}</p>
            </div>
            <div className="bg-white rounded-xl border border-tn-border p-4">
              <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide mb-2">Location</p>
              <p className="text-sm text-tn-navy leading-snug">{resource.location}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-tn-border bg-tn-cream rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold border border-tn-border bg-white text-tn-navy hover:bg-tn-light transition-colors">
            Close
          </button>
          {onEdit && (
            <button
              onClick={() => { onEdit(resource); onClose() }}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors"
            >
              Edit Resource
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── EditResourceModal ─────────────────────── */
// NOTE: the "Unit" input box has been removed on purpose. The unit
// (e.g. "Unit" / "Units") is still stored on the resource, but it is no
// longer directly editable here — instead it's shown as a small
// read-only label right next to Quantity, and it automatically
// switches between singular and plural as the user types a new
// Quantity (via pluralizeUnit above). This only affects this page.
//
// Category is a dropdown (Heavy/Medium/Low, matches the enum on
// models/Resource.js) rather than a free-text input, and Rent Per Day
// is a plain number input next to Quantity.
function EditResourceModal({ resource, onClose, onSave, saving }) {
  const [form, setForm] = useState({ ...resource })
  const isAvailable = resource.status === 'Available'

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSave() {
    onSave(form)
  }

  const labelClass = 'text-[10px] font-semibold text-tn-muted uppercase tracking-wide mb-1 block'
  const inputClass = 'w-full px-3 py-2 text-sm border border-tn-border rounded-xl bg-white text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-tn-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-tn-border">
          <div>
            <h2 className="text-lg font-extrabold text-tn-navy">Edit Resource</h2>
            <p className="text-xs text-tn-muted mt-0.5">{resource.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-tn-border text-tn-muted hover:bg-tn-light transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Resource Name</label>
              <input name="name" value={form.name} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" value={form.category || ''} onChange={handleChange} className={inputClass}>
                {['Heavy', 'Medium', 'Low'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Quantity
                {form.unit && (
                  <span className="normal-case font-medium text-tn-muted ml-1">
                    ({pluralizeUnit(form.unit, form.quantity)})
                  </span>
                )}
              </label>
              <input name="quantity" type="number" value={form.quantity} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rent Per Day (₹)</label>
              <input name="rentPerDay" type="number" min="0" value={form.rentPerDay ?? ''} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Condition</label>
              <select name="condition" value={form.condition} onChange={handleChange} className={inputClass}>
                {['Good', 'Average', 'Bad'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>District</label>
              <input name="district" value={form.district} onChange={handleChange} className={inputClass} disabled />
            </div>
            {isAvailable ? (
              <>
                <div>
                  <label className={labelClass}>Available From</label>
                  <input type="date" name="availableFrom" value={form.availableFrom || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Available To</label>
                  <input type="date" name="availableTo" value={form.availableTo || ''} onChange={handleChange} className={inputClass} />
                </div>
              </>
            ) : (
              <div>
                <label className={labelClass}>Expected Availability</label>
                <input type="date" name="expectedAvailability" value={form.expectedAvailability || ''} onChange={handleChange} className={inputClass} />
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputClass + ' resize-none'} />
          </div>
          <div>
            <label className={labelClass}>Specifications</label>
            <textarea name="specifications" value={form.specifications} onChange={handleChange} rows={2} className={inputClass + ' resize-none'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Person</label>
              <input name="contactPerson" value={form.contactPerson} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Phone</label>
              <input name="contactPhone" value={form.contactPhone} onChange={handleChange} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Contact Email</label>
              <input name="contactEmail" value={form.contactEmail} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-tn-border bg-tn-cream rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold border border-tn-border bg-white text-tn-navy hover:bg-tn-light transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── RequestDetailModal ─────────────────────── */
function RequestDetailModal({ request, onClose, onApprove, onReject }) {
  if (!request) return null
  const u = request.user

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-tn-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-tn-border">
          <div>
            <h2 className="text-lg font-extrabold text-tn-navy">Request Details</h2>
            <p className="text-xs text-tn-muted mt-0.5">{request.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={['text-[10px] font-bold px-2.5 py-1 rounded-full border', STATUS_STYLE[request.status]].join(' ')}>
              {request.status}
            </span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-tn-border text-tn-muted hover:bg-tn-light transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-tn-cream rounded-xl p-4 border border-tn-border">
            <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide mb-3">Requested Resource</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Resource Name', value: request.resourceName },
                { label: 'Resource ID',   value: request.resourceId   },
                { label: 'Quantity',      value: `${request.requiredQuantity} unit(s)` },
                { label: 'Required From', value: new Date(request.requiredFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Required To',   value: new Date(request.requiredTo).toLocaleDateString('en-IN',   { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Urgency',       value: request.urgency },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-tn-navy mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-tn-cream rounded-xl p-4 border border-tn-border">
            <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide mb-1.5">Purpose of Request</p>
            <p className="text-sm text-tn-navy leading-relaxed">{request.purpose}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-tn-navy mb-3 pb-2 border-b border-tn-border">Requester Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Name',        value: u.name        },
                { label: 'Employee ID', value: u.employeeId  },
                { label: 'Designation', value: u.designation },
                { label: 'Department',  value: u.department  },
                { label: 'District',    value: u.district    },
                { label: 'Phone',       value: u.phone       },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-tn-navy mt-0.5">{value}</p>
                </div>
              ))}
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold text-tn-muted uppercase tracking-wide">Email</p>
                <p className="text-sm font-medium text-tn-blue mt-0.5">{u.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-tn-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Requested on {new Date(request.requestedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-tn-border bg-tn-cream rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold border border-tn-border bg-white text-tn-navy hover:bg-tn-light transition-colors">
            Close
          </button>
          {request.status === 'Pending' && (
            <>
              <button
                onClick={() => { onReject(request.id); onClose() }}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => { onApprove(request.id); onClose() }}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── ResourceCard ─────────────────────────────
   Available / Not-Available tabs:
     First  button  → Edit   (blue, primary, opens edit modal)
     Second button  → View   (white/border, opens detail modal)

   Trash icon:
     A small standalone trash/delete icon button is shown ONLY when the
     card belongs to the Available tab (isAvailable === true). It sits
     next to the status badge, top-right of the card. Clicking it calls
     onDelete(resource) — it does not open the Edit or View modal.
──────────────────────────────────────────────────────────────────── */
function ResourceCard({ resource, onView, onEdit, onDelete }) {
  const isAvailable = resource.status === 'Available'

  return (
    <div className="bg-white rounded-2xl border border-tn-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      <div className={['h-1.5 w-full', isAvailable ? 'bg-emerald-400' : 'bg-red-400'].join(' ')} />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={[
              'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
              isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
            ].join(' ')}>
              <CategoryIcon category={resource.category} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-tn-navy leading-snug truncate">{resource.name}</h3>
              <p className="text-[10px] text-tn-muted">{resource.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            <span className={[
              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
              isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
            ].join(' ')}>
              {isAvailable ? 'Available' : 'Not Available'}
            </span>

            {/* Trash icon — Available tab only */}
            {isAvailable && (
              <button
                id={`delete-${resource.id}`}
                onClick={() => onDelete(resource)}
                title="Delete resource"
                className="w-6 h-6 flex items-center justify-center rounded-md text-red-400 hover:text-white hover:bg-red-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {[
            { label: 'Dept',      value: resource.department },
            { label: 'District',  value: resource.district   },
            { label: 'Qty',       value: `${resource.quantity} ${pluralizeUnit(resource.unit, resource.quantity)}` },
            { label: 'Condition', value: resource.condition  },
            { label: 'Category',  value: resource.category || '—' },
            { label: 'Rent/Day',  value: formatRate(resource.rentPerDay) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] font-semibold text-tn-muted uppercase tracking-wide">{label}</p>
              <p className="text-xs font-medium text-tn-navy mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-tn-muted bg-tn-cream px-3 py-1.5 rounded-lg border border-tn-border mb-4">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {isAvailable
            ? (resource.availableFrom && resource.availableTo
                ? `${new Date(resource.availableFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(resource.availableTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : 'Available now')
            : (resource.expectedAvailability
                ? `Expected: ${new Date(resource.expectedAvailability).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : 'Expected date not set')
          }
        </div>

        <div className="flex-1" />

        {/* Edit (blue, primary) first, then View (white) second */}
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-tn-border">
          <button
            id={`edit-${resource.id}`}
            onClick={() => onEdit(resource)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            id={`view-${resource.id}`}
            onClick={() => onView(resource)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-tn-border text-tn-navy bg-white hover:bg-tn-light transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── RequestCard ───────────────────────────────
   Buttons vary by which tab is active:
     Request  (Pending)  tab → View + Approve + Reject
     Approved tab             → View + Reject   (no Approve — already approved)
     Rejected tab              → View only       (already rejected, nothing to do)
──────────────────────────────────────────────────────────────────── */
function RequestCard({ request, onView, onApprove, onReject, activeTab }) {
  return (
    <div
      className="bg-white rounded-2xl border border-tn-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden cursor-pointer"
      onClick={() => onView(request)}
    >
      {/* Color strip */}
      <div className={[
        'h-1.5 w-full',
        request.status === 'Approved' ? 'bg-emerald-400' :
        request.status === 'Rejected' ? 'bg-red-400'     : 'bg-amber-400',
      ].join(' ')} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-tn-navy leading-snug">{request.resourceName}</h3>
            <p className="text-[10px] text-tn-muted">{request.id}</p>
          </div>
          <span className={['text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5', STATUS_STYLE[request.status]].join(' ')}>
            {request.status}
          </span>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {[
            { label: 'Requested By', value: request.requestedBy },
            { label: 'Quantity',     value: `${request.requiredQuantity} unit(s)` },
            { label: 'From',         value: new Date(request.requiredFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
            { label: 'To',           value: new Date(request.requiredTo).toLocaleDateString('en-IN',   { day: '2-digit', month: 'short', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] font-semibold text-tn-muted uppercase tracking-wide">{label}</p>
              <p className="text-xs font-medium text-tn-navy mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        {/* Urgency + Date */}
        <div className="flex items-center gap-2 mb-4">
          <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full', URGENCY_STYLE[request.urgency]].join(' ')}>
            {request.urgency} Priority
          </span>
          <span className="text-[10px] text-tn-muted ml-auto">
            {new Date(request.requestedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex-1" />

        {/* ── Action buttons — vary by active tab ── */}
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-tn-border" onClick={e => e.stopPropagation()}>

          {/* View — always present on every tab (Request / Approved / Rejected) */}
          <button
            id={`view-req-${request.id}`}
            onClick={() => onView(request)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-tn-border text-tn-navy bg-white hover:bg-tn-light transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>

          {/* Approve — only on the Requests (Pending) tab */}
          {activeTab === 'Request' && (
            <button
              id={`approve-req-${request.id}`}
              onClick={() => onApprove(request.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
          )}

          {/* Reject — on Requests (Pending) tab AND Approved tab; hidden on Rejected tab */}
          {(activeTab === 'Request' || activeTab === 'Approved') && (
            <button
              id={`reject-req-${request.id}`}
              onClick={() => onReject(request.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          )}

        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── Main Page ─────────────────────── */
const PAGE_SIZE = 6

export default function ResourceSharing() {
  const { apiFetch } = useApi()

  const [activeTab,     setActiveTab]     = useState('Available')
  const [animating,     setAnimating]     = useState(false)
  const [currentPage,   setCurrentPage]   = useState(1)

  // Search is now auto-search (debounced), same pattern as
  // CancelledRetendered.jsx — "keyword" drives the request directly,
  // there's no separate applied/staged search state or Search button.
  const [keyword, setKeyword] = useState('')

  // Available / Not-Available are now fetched from the API (see
  // fetchResources below). requestList (Request/Approved/Rejected)
  // still runs on mock data — no backend was requested for those tabs.
  const [availableList,   setAvailableList]   = useState([])
  const [unavailableList, setUnavailableList] = useState([])
  const [requestList,     setRequestList]     = useState(RESOURCE_REQUESTS)

  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourcesTotal,   setResourcesTotal]   = useState(0) // server-side total, for pagination on resource tabs
  const [savingEdit,       setSavingEdit]       = useState(false)

  const [viewResource,   setViewResource]   = useState(null)
  const [editResource,   setEditResource]   = useState(null)
  const [deleteResource, setDeleteResource] = useState(null)
  const [viewRequest,    setViewRequest]    = useState(null)
  const [toast,          setToast]          = useState(null)

  const debounceRef = useRef(null)
  const isFirstRun  = useRef(true)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const isResourceTab = activeTab === 'Available' || activeTab === 'Not-Available'
  const isRequestTab  = activeTab === 'Request' || activeTab === 'Approved' || activeTab === 'Rejected'

  /* ── Fetch Available / Not-Available from the API ──
     Re-runs whenever the active resource tab, keyword, or page
     changes. No-ops (and clears loading) when on a request tab. */
  const fetchResources = useCallback(async (tab, kw, page) => {
    if (tab !== 'Available' && tab !== 'Not-Available') return
    setResourcesLoading(true)
    try {
      const endpoint = tab === 'Available' ? '/resource-sharing/available' : '/resource-sharing/unavailable'
      const params = new URLSearchParams({
        search: kw,
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      const res = await apiFetch(`${endpoint}?${params.toString()}`)
      if (tab === 'Available') setAvailableList(res.data)
      else setUnavailableList(res.data)
      setResourcesTotal(res.pagination.total)
    } catch (err) {
      showToast(err.message || 'Failed to load resources', 'error')
    } finally {
      setResourcesLoading(false)
    }
  }, [apiFetch])

  // ── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    fetchResources(activeTab, '', 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-search: debounced, fires on keyword change ────────────────
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1)
      if (isResourceTab) fetchResources(activeTab, keyword, 1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  function switchTab(id) {
    if (id === activeTab) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setAnimating(true)
    setCurrentPage(1)
    setKeyword('')
    setTimeout(() => {
      setActiveTab(id)
      setAnimating(false)
      if (id === 'Available' || id === 'Not-Available') fetchResources(id, '', 1)
    }, 150)
  }

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setKeyword('')
    setCurrentPage(1)
    if (isResourceTab) fetchResources(activeTab, '', 1)
  }

  function handlePageChange(page) {
    setCurrentPage(page)
    if (isResourceTab) fetchResources(activeTab, keyword, page)
  }

  async function handleSaveEdit(updatedResource) {
    setSavingEdit(true)
    try {
      await apiFetch(`/resource-sharing/${updatedResource.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedResource),
      })
      showToast('Resource updated successfully')
      setEditResource(null)
      fetchResources(activeTab, keyword, currentPage)
    } catch (err) {
      showToast(err.message || 'Failed to update resource', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  // Only reachable from the Available tab (trash icon is only rendered
  // there). Soft-deletes server-side, then refetches the current page.
  async function confirmDelete(resource) {
    try {
      await apiFetch(`/resource-sharing/${resource.id}`, { method: 'DELETE' })
      showToast('Resource deleted successfully', 'error')
      fetchResources(activeTab, keyword, currentPage)
    } catch (err) {
      showToast(err.message || 'Failed to delete resource', 'error')
    } finally {
      setDeleteResource(null)
    }
  }

  function handleApprove(reqId) {
    setRequestList(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Approved' } : r))
    showToast('Request Approved Successfully')
  }

  function handleReject(reqId) {
    setRequestList(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Rejected' } : r))
    showToast('Request Rejected', 'error')
  }

  // Request/Approved/Rejected tabs still filter+paginate client-side
  // (mock data). Available/Not-Available are already the current
  // page's worth of server-filtered data — nothing more to slice.
  const filteredRequests = useMemo(() => {
    if (!isRequestTab) return []
    const q = keyword.toLowerCase().trim()
    const statusMap = { Request: 'Pending', Approved: 'Approved', Rejected: 'Rejected' }
    const statusFilter = statusMap[activeTab]
    return requestList
      .filter(r => r.status === statusFilter)
      .filter(r =>
        !q || r.resourceName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q) || r.user.name.toLowerCase().includes(q)
      )
  }, [isRequestTab, activeTab, keyword, requestList])

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRequests.slice(start, start + PAGE_SIZE)
  }, [filteredRequests, currentPage])

  const currentResourceList = activeTab === 'Available' ? availableList : unavailableList
  const totalCount = isResourceTab ? resourcesTotal : filteredRequests.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const paginated   = isResourceTab ? currentResourceList : paginatedRequests

  const EMPTY_TEXT = {
    'Available':     'No available resources found.',
    'Not-Available': 'No unavailable resources found.',
    'Request':       'No pending requests found.',
    'Approved':      'No approved requests found.',
    'Rejected':      'No rejected requests found.',
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in bg-tn-cream">
      <Toast toast={toast} />

      {/* Modals */}
      {viewResource && (
        <ResourceDetailModal
          resource={viewResource}
          onClose={() => setViewResource(null)}
          onEdit={(r) => { setViewResource(null); setEditResource(r) }}
        />
      )}
      {editResource && (
        <EditResourceModal
          resource={editResource}
          onClose={() => setEditResource(null)}
          onSave={handleSaveEdit}
          saving={savingEdit}
        />
      )}
      {viewRequest && (
        <RequestDetailModal
          request={viewRequest}
          onClose={() => setViewRequest(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
      {deleteResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteResource(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl border border-tn-border w-full max-w-sm p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-tn-navy mb-1">Delete this resource?</h3>
            <p className="text-sm text-tn-muted mb-5">
              "{deleteResource.name}" ({deleteResource.id}) will be permanently removed from the Available list.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteResource(null)} className="px-4 py-2 rounded-xl text-sm font-semibold border border-tn-border bg-white text-tn-navy hover:bg-tn-light transition-colors">
                Cancel
              </button>
              <button onClick={() => confirmDelete(deleteResource)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-tn-navy">Resource Sharing</h1>
          <p className="text-sm text-tn-muted mt-0.5">Manage and share government resources across departments.</p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-tn-muted">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-semibold">Resource Sharing</span>
        </nav>
      </div>

      {/* Search Bar — auto-search, debounced, no Search button */}
      <div className="bg-white border border-tn-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={
                isResourceTab
                  ? 'Search by name, ID, department, district…'
                  : 'Search by request ID, resource, requester…'
              }
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-tn-border rounded-xl bg-white text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue transition-all"
            />
            {resourcesLoading && isResourceTab && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <div className="w-4 h-4 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {keyword && (
            <button
              onClick={handleClear}
              className="text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap flex-shrink-0"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm flex-wrap gap-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={[
                  'px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 gsp',
                  isActive
                    ? 'bg-tn-navy text-white shadow-sm'
                    : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <span className="text-xs font-medium text-tn-muted bg-white border border-tn-border px-3 py-1.5 rounded-full">
          {totalCount} {isResourceTab ? 'resource' : 'request'}{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards Grid */}
      <div className={['transition-opacity duration-150', (animating || resourcesLoading) ? 'opacity-0' : 'opacity-100'].join(' ')}>
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-tn-border border-dashed">
            <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
              <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-bold text-tn-navy mb-1">{EMPTY_TEXT[activeTab]}</p>
            <p className="text-sm text-tn-muted">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {isResourceTab
              ? paginated.map(res => (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    onView={setViewResource}
                    onEdit={setEditResource}
                    onDelete={setDeleteResource}
                  />
                ))
              : paginated.map(req => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    activeTab={activeTab}
                    onView={setViewRequest}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))
            }
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  )
}