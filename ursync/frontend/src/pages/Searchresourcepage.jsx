import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Info } from 'lucide-react'
import { useApi } from '../api/client'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 6

/* Falls back to the Heavy Equipment icon for an unmapped category. */
function CategoryIcon({ category }) {
  const map = {
    'Heavy Equipment':        'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    'Lifting Equipment':      'M13 10V3L4 14h7v7l9-11h-7z',
    'Concrete Equipment':     'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    'Support Equipment':      'M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4',
    'Road Equipment':         'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    'Transport Equipment':    'M3 13h1v6a1 1 0 001 1h1a1 1 0 001-1v-1h10v1a1 1 0 001 1h1a1 1 0 001-1v-6h1V8l-2-5H5L3 8v5z',
    'Power Equipment':        'M13 10V3L4 14h7v7l9-11h-7z',
    'Foundation Equipment':   'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  }
  const d = map[category] || map['Heavy Equipment']
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  )
}

/* ─────────────────────── DateVariationsModal ─────────────────────── */
function DateVariationsModal({ resource, searchFrom, searchTo, onClose, onGetResource }) {
  if (!resource) return null

  const variations = resource.dateVariations || []
  const totalUnits = resource.available || 0
  const availableUnits = resource.availableQuantity !== undefined ? resource.availableQuantity : totalUnits

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-tn-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-tn-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-tn-light flex items-center justify-center text-tn-blue flex-shrink-0 border border-tn-border">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-tn-navy">{resource.name}</h2>
              <p className="text-xs text-tn-muted mt-0.5">
                {resource.resourceId || resource._id} · Total Inventory: <span className="font-semibold text-tn-navy">{totalUnits} units</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-tn-border text-tn-muted hover:bg-tn-light transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Selected Search Window Banner */}
          {searchFrom && searchTo ? (
            <div className="bg-tn-cream border border-tn-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-tn-muted uppercase tracking-wider">Requested Date Range</p>
                <p className="text-sm font-bold text-tn-navy mt-0.5">
                  {formatDate(searchFrom)} – {formatDate(searchTo)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-tn-muted font-medium">Minimum Available:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  availableUnits > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {availableUnits} of {totalUnits} units
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-tn-cream border border-tn-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-tn-navy">Overall Availability Schedule</p>
                <p className="text-xs text-tn-muted mt-0.5">Showing scheduled bookings and remaining availability by date range.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {totalUnits} units in stock
              </span>
            </div>
          )}

          {/* Date Variation Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-tn-navy uppercase tracking-wider">
                Date-wise Availability Variations & Bookings Log
              </h3>
              <span className="text-[11px] text-tn-muted font-medium">
                {variations.length} interval{variations.length !== 1 ? 's' : ''}
              </span>
            </div>

            {variations.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                <p className="text-sm font-bold text-emerald-800">Full Availability</p>
                <p className="text-xs text-emerald-700 mt-1">
                  All {totalUnits} units are completely free and available with no approved reservations.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {variations.map((slot, index) => {
                  const avail = slot.availableQuantity !== undefined ? slot.availableQuantity : (totalUnits - (slot.bookedQuantity || 0))
                  const booked = slot.bookedQuantity || 0
                  const percentAvail = totalUnits > 0 ? Math.round((avail / totalUnits) * 100) : 0

                  return (
                    <div
                      key={index}
                      className="bg-white border border-tn-border rounded-xl p-4 shadow-sm hover:border-tn-blue/40 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-tn-blue" />
                          <span className="text-xs font-bold text-tn-navy">
                            {formatDate(slot.from)} – {formatDate(slot.to)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            booked > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {booked} Booked
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            avail > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {avail} Available
                          </span>
                        </div>
                      </div>

                      {/* Visual availability progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all duration-300 ${
                            avail === 0 ? 'bg-red-400' : avail < totalUnits ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percentAvail}%` }}
                        />
                      </div>

                      {/* Request details if present */}
                      {slot.requests && slot.requests.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-dashed border-tn-border text-[11px] text-tn-muted space-y-1">
                          {slot.requests.map((r, rIdx) => (
                            <p key={rIdx}>
                              • <span className="font-semibold text-tn-navy">{r.quantity} unit(s)</span> approved for <span className="text-tn-navy">{r.applicantName || 'Applicant'}</span> ({r.projectName || 'Project'})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-tn-border bg-tn-cream rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-tn-border bg-white text-tn-navy hover:bg-tn-light transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose()
              onGetResource(resource)
            }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors"
          >
            Get Resource
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── SearchResourceCard ───────────────────────────
   Displays resource metadata, availability, Schedule button for date variations,
   and always-enabled Get Resource button.
──────────────────────────────────────────────────────────────────── */
function SearchResourceCard({ resource, onView, onViewVariations, onGetResource }) {
  const district = resource.district?.name || resource.district?.code || 'Not specified'
  const department = resource.departmentId?.name || resource.departmentId?.code || 'Not specified'
  const availableUnits = resource.availableQuantity !== undefined ? resource.availableQuantity : (resource.available || 0)
  const availableForDates = resource.availableForDates !== false && availableUnits > 0

  return (
    <div className="bg-white rounded-2xl border border-tn-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      <div className={`h-1.5 w-full ${availableForDates ? 'bg-emerald-400' : 'bg-red-400'}`} />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${availableForDates ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              <CategoryIcon category={resource.category} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-tn-navy leading-snug truncate">{resource.name}</h3>
              <p className="text-[10px] text-tn-muted">{resource.resourceId || resource._id}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${availableForDates ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {availableForDates ? 'Available' : 'Unavailable for selected dates'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {[
            { label: 'District', value: district },
            { label: 'Owner Department', value: department },
            { label: 'Total Units', value: resource.available },
            { label: 'Available Units', value: availableUnits },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] font-semibold text-tn-muted uppercase tracking-wide">{label}</p>
              <p className="text-xs font-medium text-tn-navy mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-tn-muted bg-tn-cream px-3 py-1.5 rounded-lg border border-tn-border mb-4">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {resource.availabilityMessage || (availableUnits < resource.available ? `Min. ${availableUnits} of ${resource.available} units available.` : resource.description || 'Full inventory currently available.')}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-tn-border">
          <button
            onClick={() => onView(resource)}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-tn-border text-tn-navy bg-white hover:bg-tn-light transition-colors"
            title="View full resource details"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
          <button
            onClick={() => onViewVariations(resource)}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-tn-border text-tn-navy bg-white hover:bg-tn-light transition-colors"
            title="View multiple date variations schedule"
          >
            <Calendar size={13} className="text-tn-blue" />
            Schedule
          </button>
          <button
            onClick={() => onGetResource(resource)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Get Resource
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── Main Page ─────────────────────── */
export default function SearchResourcePage() {
  const navigate = useNavigate()
  const { apiFetch } = useApi()
  const [search, setSearch] = useState('')
  const [requiredFrom, setRequiredFrom] = useState('')
  const [requiredTo, setRequiredTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [resources, setResources] = useState([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [resourceError, setResourceError] = useState('')
  const [variationResource, setVariationResource] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingResources(true)
    setResourceError('')

    const params = new URLSearchParams()
    if (requiredFrom && requiredTo) {
      params.set('requiredFrom', requiredFrom)
      params.set('requiredTo', requiredTo)
    }
    const query = params.toString() ? `?${params.toString()}` : ''

    apiFetch(`/resources${query}`)
      .then((data) => {
        if (!cancelled) setResources(data.resources || [])
      })
      .catch((err) => {
        if (!cancelled) setResourceError(err.message || 'Failed to load resources.')
      })
      .finally(() => {
        if (!cancelled) setLoadingResources(false)
      })

    return () => { cancelled = true }
  }, [apiFetch, requiredFrom, requiredTo])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return resources
    return resources.filter((r) => {
      const searchableText = [
        r.name,
        r._id,
        r.resourceId,
        r.category,
        r.description,
        r.district?.name,
        r.district?.code,
        r.departmentId?.name,
        r.departmentId?.code,
      ].filter(Boolean).join(' ').toLowerCase()
      return searchableText.includes(q)
    }
    )
  }, [search, resources])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const today = new Date().toISOString().split('T')[0]

  function handleRequiredFromChange(value) {
    setRequiredFrom(value)
    if (requiredTo && value && requiredTo < value) {
      setRequiredTo('')
    }
    setCurrentPage(1)
  }

  function handleRequiredToChange(value) {
    setRequiredTo(value)
    setCurrentPage(1)
  }

  function handleClear() {
    setSearch('')
    setRequiredFrom('')
    setRequiredTo('')
    setCurrentPage(1)
  }

  function handleChipClick(chip) {
    setSearch(chip)
  }

  function goTo(path, opts) {
    window.scrollTo({ top: 0, behavior: 'instant' })
    navigate(path, opts)
  }

  const CHIPS = ['JCB', 'Crane', 'Bulldozer', 'Water Tanker', 'Tipper', 'Generator', 'Roller', 'Paver']

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-screen animate-fade-in bg-tn-cream">
      {variationResource && (
        <DateVariationsModal
          resource={variationResource}
          searchFrom={requiredFrom}
          searchTo={requiredTo}
          onClose={() => setVariationResource(null)}
          onGetResource={(r) => goTo('/search-resource/get-resource', { state: { resource: r, startDate: requiredFrom, endDate: requiredTo } })}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">Search Resource</h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Search for available government construction resources such as JCB, crane, bulldozer and more.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-tn-muted">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Search Resource</span>
        </nav>
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white border border-tn-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="e.g. JCB, crane, bulldozer, water tanker…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-tn-border rounded-xl bg-white text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="date"
              min={today}
              value={requiredFrom}
              onChange={(e) => handleRequiredFromChange(e.target.value)}
              className="px-3 py-2.5 text-sm border border-tn-border rounded-xl text-tn-navy bg-white focus:outline-none focus:ring-2 focus:ring-tn-blue/30"
              aria-label="Required from date"
              title="Required from date"
            />
            <input
              type="date"
              min={requiredFrom || today}
              value={requiredTo}
              disabled={!requiredFrom}
              onChange={(e) => handleRequiredToChange(e.target.value)}
              className={`px-3 py-2.5 text-sm border border-tn-border rounded-xl text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/30 transition-opacity ${
                !requiredFrom ? 'opacity-50 cursor-not-allowed bg-tn-light/50' : 'bg-white'
              }`}
              aria-label="Required to date"
              title={!requiredFrom ? 'Select Required From date first' : 'Required To date'}
            />
          </div>

          {(search || requiredFrom || requiredTo) && (
            <button onClick={handleClear} className="text-xs text-tn-muted hover:text-tn-danger underline px-2 whitespace-nowrap">
              Clear All
            </button>
          )}
        </div>

        {/* Popular chips — active state matches ResourceSharing's tab pill style */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-tn-muted font-semibold">Popular:</span>
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setSearch(chip)
                setCurrentPage(1)
              }}
              className={[
                'text-[11px] px-3 py-1 rounded-full border transition-colors font-medium',
                search === chip
                  ? 'bg-tn-navy text-white border-tn-navy'
                  : 'bg-tn-light border-tn-border text-tn-navy hover:bg-tn-light/70',
              ].join(' ')}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {resourceError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {resourceError}
        </div>
      )}

      {/* ── Result count row (same pill style as ResourceSharing's tab-bar count) ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-semibold text-tn-navy">
          {search
            ? filtered.length > 0
              ? `Showing ${filtered.length} available resource${filtered.length !== 1 ? 's' : ''} for "${search}"`
              : `No available resources found for "${search}"`
            : `Showing ${filtered.length} available resource${filtered.length !== 1 ? 's' : ''}`}
        </p>
        <span className="text-xs font-medium text-tn-muted bg-white border border-tn-border px-3 py-1.5 rounded-full">
          {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Cards grid ── */}
      {loadingResources ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-tn-border">
          <div className="w-6 h-6 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-tn-muted">Loading resources...</span>
        </div>
      ) : (
        <>
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-tn-border border-dashed">
              <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
                <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="font-bold text-tn-navy mb-1">No resources found</p>
              <p className="text-sm text-tn-muted">Try a different keyword like "JCB", "crane" or "mixer".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
              {paginated.map((res) => (
                <SearchResourceCard
                  key={res._id}
                  resource={res}
                  onView={(r) => goTo('/search-resource/details', { state: { resource: r } })}
                  onViewVariations={(r) => setVariationResource(r)}
                  onGetResource={(r) => goTo('/search-resource/get-resource', { state: { resource: r, startDate: requiredFrom, endDate: requiredTo } })}
                />
              ))}
            </div>
          )}

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}
    </div>
  )
}