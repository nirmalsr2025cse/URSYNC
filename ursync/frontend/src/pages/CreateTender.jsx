// src/pages/CreateTender.jsx
// Wired to the real backend: POST/PUT /api/create-tenders, PATCH
// /api/create-tenders/:id/send-to-head, PATCH .../send-to-administrator,
// GET /api/create-tenders/meta/form for department/category/district IDs.
//
// Fields collected map 1:1 to CreateTender.model.js: title, description,
// categoryId, districtId, location, taluk, village, latitude/longitude,
// estimatedValue, currency, duration, startDate, closingDate, tenderType,
// priority, image, documentUrl, tenderId.

import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRole } from '../components/RoleContext'
import { useApi } from '../api/client'
import LatLngInput from '../components/LatLngInput'
import { broadcastEvent, subscribeToCrossTab } from '../utils/crossTabSync'
import { calculateHaversineDistanceKm, isTenderRangeApproxMatch } from '../utils/geoUtils'

const MAX_PDF_SIZE_MB = 10

// <input type="date"> requires strict "yyyy-MM-dd" — Mongo/JS Date values
// come back as full ISO datetime strings ("2026-09-01T00:00:00.000Z"), so
// they need slicing before they can be used as a date input's value.
function toDateInputValue(value) {
  if (!value) return ''
  const iso = value instanceof Date ? value.toISOString() : String(value)
  return iso.slice(0, 10) // "2026-09-01T00:00:00.000Z" -> "2026-09-01"
}

// ── Section Wrapper ───────────────────────────────────────────────────────────
function FormSection({ title, icon, children }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#FFE5BF] bg-[#FFFAF3]">
        <div className="w-8 h-8 rounded-lg bg-[#0A2240] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-[#0A2240]">{title}</h2>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  )
}

// ── Field Wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, error, fullWidth, children }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-[#0A2240] mb-1.5">
        {label} {required && <span className="text-[#F62440]">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[10px] text-[#F62440] mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass = "w-full px-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
const inputError = "w-full px-4 py-2.5 text-sm border border-[#F62440] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#F62440]/30 focus:border-[#F62440] transition-all"
const readOnlyClass = "w-full px-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-[#FFF2DB] text-[#6B7A8D] cursor-not-allowed"

// ── PDF Upload Field ───────────────────────────────────────────────────────────
function PdfUploadField({ fileName, fileSizeLabel, onSelect, onRemove, error }) {
  const inputRef = useRef(null)

  function triggerPick() {
    inputRef.current?.click()
  }

  function handleFiles(files) {
    const file = files?.[0]
    if (!file) return
    onSelect(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {!fileName ? (
        <div
          onClick={triggerPick}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          className={[
            'flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-center',
            error ? 'border-[#F62440] bg-red-50' : 'border-[#FFE5BF] bg-[#FFFAF3] hover:bg-[#FFF2DB]',
          ].join(' ')}
        >
          <div className="w-9 h-9 rounded-lg bg-[#1A4A8C] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#0A2240]">
            Click to upload or drag &amp; drop
          </p>
          <p className="text-xs text-[#6B7A8D]">PDF only, up to {MAX_PDF_SIZE_MB}MB</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-[#FFE5BF] bg-[#FFF2DB]">
          <div className="w-10 h-10 rounded-lg bg-[#1A4A8C] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A2240] truncate">{fileName}</p>
            <p className="text-xs text-[#6B7A8D]">{fileSizeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6B7A8D] hover:bg-[#FFE5BF] hover:text-[#F62440] transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Duration <-> Date auto-calculation helpers ────────────────────────────
// Duration is stored as free text (e.g. "120 days"), but for the
// auto-calc we only care about the leading integer.
function parseDurationDays(durationStr) {
  if (!durationStr) return null
  const match = String(durationStr).match(/\d+/)
  if (!match) return null
  const n = parseInt(match[0], 10)
  return Number.isFinite(n) ? n : null
}

// yyyy-MM-dd + integer days -> yyyy-MM-dd
// NOTE: deliberately avoids `new Date(str)` + `.toISOString()` — that path
// interprets the input as LOCAL time then converts to UTC, which silently
// shifts the date backward by a day in timezones ahead of UTC (e.g. IST,
// UTC+5:30). Doing the arithmetic purely in UTC Y/M/D components sidesteps
// that entirely.
function addDaysToDate(dateStr, days) {
  if (!dateStr || days == null) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return ''
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// yyyy-MM-dd, yyyy-MM-dd -> integer days (closing - start)
function diffInDays(startStr, endStr) {
  if (!startStr || !endStr) return null
  const [y1, m1, d1] = startStr.split('-').map(Number)
  const [y2, m2, d2] = endStr.split('-').map(Number)
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null
  const start = Date.UTC(y1, m1 - 1, d1)
  const end = Date.UTC(y2, m2 - 1, d2)
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24))
  return days >= 0 ? days : null
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CreateTender() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role }  = useRole()
  const { apiFetch } = useApi()

  const editData  = location.state?.tender || null
  const fromPath  = location.state?.fromPath || '/create-saved-tenders'

  const [toast, setToast]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState({})
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError]     = useState(null)
  const [meta, setMeta] = useState({ department: null, categories: [], districts: [] })

  // Tracks the DB _id of the tender currently being edited. Starts as
  // editData?.id (editing an existing draft) and gets set the moment a
  // brand-new tender is first saved, so a subsequent "Send" doesn't try to
  // create a second duplicate document.
  const [tenderRecordId, setTenderRecordId] = useState(editData?.id || null)
  const [lastUpdated, setLastUpdated] = useState(editData?.lastUpdated || editData?.updatedAt || null)
  const [remoteConflict, setRemoteConflict] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    tenderId:         editData?.tenderId          || '',
    title:            editData?.title             || '',
    categoryId:       editData?.categoryId         || '',
    procurementType:  editData?.procurementType    || 'Works',
    districtId:       editData?.districtId         || '',
    description:      editData?.description        || '',
    estimatedValue:   editData?.estimatedValue      || editData?.amount || '',
    startDate:        toDateInputValue(editData?.startDate),
    closingDate:      toDateInputValue(editData?.closingDate || editData?.endDate),
    duration:         editData?.duration            || '',
    location:         editData?.location            || '',
    taluk:            editData?.taluk               || '',
    village:          editData?.village             || '',
    // Holds { address, lat, lng } for starting coordinates
    coordinates:      (editData && typeof (editData.startLatitude ?? editData.latitude) === 'number')
      ? { lat: editData.startLatitude ?? editData.latitude, lng: editData.startLongitude ?? editData.longitude, address: editData.location || '' }
      : null,
    // Holds { address, lat, lng } for ending coordinates
    endCoordinates:   (editData && typeof editData.endLatitude === 'number')
      ? { lat: editData.endLatitude, lng: editData.endLongitude, address: '' }
      : null,
    tenderRange:      editData?.tenderRange != null ? String(editData.tenderRange) : '',
    documentUrl:      editData?.documentUrl        || '',
    image:            editData?.image              || '',
  })

  const [documentFile, setDocumentFile] = useState(
    editData?.documentUrl ? { name: editData.documentFileName || 'Existing document.pdf', size: editData.documentFileSize || null } : null
  )

  // Calculated Haversine straight-line distance between start and end coordinates
  const calculatedDist = (
    form.coordinates?.lat != null &&
    form.coordinates?.lng != null &&
    form.endCoordinates?.lat != null &&
    form.endCoordinates?.lng != null
  ) ? calculateHaversineDistanceKm(
      form.coordinates.lat,
      form.coordinates.lng,
      form.endCoordinates.lat,
      form.endCoordinates.lng
    ) : null

  // ── Listen to real-time cross-tab updates without reloading ────────────────
  useEffect(() => {
    const unsubscribe = subscribeToCrossTab((data) => {
      if (!data || !data.payload) return
      const { id, tenderId, action, updatedAt, status } = data.payload

      // If the broadcasted event targets this tender
      const matchesCurrent =
        (tenderRecordId && String(id) === String(tenderRecordId)) ||
        (form.tenderId && tenderId && form.tenderId.trim().toLowerCase() === tenderId.trim().toLowerCase())

      if (matchesCurrent) {
        setRemoteConflict({
          time: new Date(data.timestamp).toLocaleTimeString(),
          action: action || 'updated',
          status: status || null,
          updatedAt: updatedAt || null,
        })
      }
    })

    return unsubscribe
  }, [tenderRecordId, form.tenderId])

  // ── Load department/category/district IDs from the backend ──────────────────
  useEffect(() => {
    let cancelled = false
    setMetaLoading(true)
    setMetaError(null)

    apiFetch('/create-tenders/meta/form')
      .then((res) => {
        if (cancelled) return
        setMeta(res.data)
        // Prefill categoryId/districtId when editing and the backend
        // returned them as populated objects (formatTender gives us
        // names, not ids, on GET) — only backfill if the form doesn't
        // already have a valid id selected.
        setForm((prev) => ({
          ...prev,
          categoryId: prev.categoryId || '',
          districtId: prev.districtId || '',
        }))
      })
      .catch((err) => {
        if (!cancelled) setMetaError(err.message || 'Failed to load form options.')
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  // Duration + Start Date -> auto-calculates Closing Date.
  // Start Date + Closing Date -> auto-calculates Duration.
  // Whichever field the user edits, the *other pair* is what gets
  // recomputed, so we never fight the field the user is actively typing in.

  function handleStartDateChange(value) {
    setForm(prev => {
      const next = { ...prev, startDate: value }
      const days = parseDurationDays(prev.duration)
      if (days != null && value) {
        // Duration is known -> recompute Closing Date from the new Start Date.
        next.closingDate = addDaysToDate(value, days)
      } else if (prev.closingDate && value) {
        // No duration set yet, but Closing Date exists -> recompute Duration.
        const d = diffInDays(value, prev.closingDate)
        if (d != null) next.duration = `${d} days`
      }
      return next
    })
    setErrors(prev => ({ ...prev, startDate: '', closingDate: '' }))
  }

  function handleDurationChange(value) {
    setForm(prev => {
      const next = { ...prev, duration: value }
      const days = parseDurationDays(value)
      if (days != null && prev.startDate) {
        next.closingDate = addDaysToDate(prev.startDate, days)
      }
      return next
    })
    if (errors.duration) setErrors(prev => ({ ...prev, duration: '' }))
    setErrors(prev => ({ ...prev, closingDate: '' }))
  }

  function handleClosingDateChange(value) {
    setForm(prev => {
      const next = { ...prev, closingDate: value }
      if (prev.startDate && value) {
        const d = diffInDays(prev.startDate, value)
        if (d != null) next.duration = `${d} days`
      }
      return next
    })
    setErrors(prev => ({ ...prev, closingDate: '' }))
  }

  function handlePdfSelect(file) {
    if (file.type !== 'application/pdf') {
      setErrors(prev => ({ ...prev, documentUrl: 'Only PDF files are allowed.' }))
      return
    }
    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      setErrors(prev => ({ ...prev, documentUrl: `File must be under ${MAX_PDF_SIZE_MB}MB.` }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      set('documentUrl', reader.result) // base64 data URL, works directly as an <a href>
      setDocumentFile({ name: file.name, size: file.size })
      setErrors(prev => ({ ...prev, documentUrl: '' }))
    }
    reader.onerror = () => {
      setErrors(prev => ({ ...prev, documentUrl: 'Could not read this file. Please try again.' }))
    }
    reader.readAsDataURL(file)
  }

  function handlePdfRemove() {
    setDocumentFile(null)
    set('documentUrl', '')
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!form.tenderId.trim())       e.tenderId       = 'Tender ID is required.'
    if (!form.title.trim())          e.title          = 'Title is required.'
    if (!form.categoryId)            e.categoryId     = 'Please select a category.'
    if (!form.districtId)            e.districtId     = 'Please select a district.'
    if (!form.description.trim())    e.description    = 'Description is required.'
    if (!form.estimatedValue.toString().trim()) e.estimatedValue = 'Estimated value is required.'
    if (!form.startDate)             e.startDate      = 'Start date is required.'
    if (!form.closingDate)           e.closingDate    = 'Closing date is required.'
    if (form.startDate && form.closingDate && form.closingDate <= form.startDate) {
      e.closingDate = 'Closing date must be after start date.'
    }
    if (!form.location.trim())       e.location       = 'Location is required.'
    if (!form.coordinates)           e.coordinates    = 'Please select starting coordinates from the suggestions.'

    if (form.coordinates && form.endCoordinates && form.tenderRange !== '' && form.tenderRange != null) {
      const isMatch = isTenderRangeApproxMatch(
        form.coordinates.lat,
        form.coordinates.lng,
        form.endCoordinates.lat,
        form.endCoordinates.lng,
        form.tenderRange
      )
      if (!isMatch) {
        e.tenderRange = `Entered range (${form.tenderRange} km) does not approximately match the calculated distance (${calculatedDist} km) between starting and ending coordinates.`
      }
    }

    return e
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Scrolls to / focuses the first field with an error so a validation
  // failure is never silent — used by both Save and Send below.
  function focusFirstError(e) {
    const firstKey = Object.keys(e)[0]
    if (!firstKey) return
    // Fields are rendered with plain inputs/selects/textareas; a
    // best-effort querySelector keeps this decoupled from refs per field.
    const el = document.querySelector(`[name="${firstKey}"]`)
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function buildPayload() {
    return {
      tenderId: form.tenderId,
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      procurementType: form.procurementType || 'Works',
      districtId: form.districtId,
      location: form.location,
      taluk: form.taluk,
      village: form.village,
      latitude: form.coordinates?.lat ?? null,
      longitude: form.coordinates?.lng ?? null,
      startLatitude: form.coordinates?.lat ?? null,
      startLongitude: form.coordinates?.lng ?? null,
      endLatitude: form.endCoordinates?.lat ?? null,
      endLongitude: form.endCoordinates?.lng ?? null,
      tenderRange: form.tenderRange !== '' && form.tenderRange != null ? Number(form.tenderRange) : null,
      estimatedValue: Number(form.estimatedValue),
      duration: form.duration,
      startDate: form.startDate,
      closingDate: form.closingDate,
      image: form.image,
      documentUrl: form.documentUrl,
      documentFileName: documentFile?.name || '',
      documentFileSize: documentFile?.size || null,
      lastUpdated: lastUpdated || null,
    }
  }

  // ── Load latest data in-place without page reload ─────────────────────────
  async function handleLoadLatestChanges() {
    if (!tenderRecordId) return
    setIsSyncing(true)
    try {
      const res = await apiFetch(`/create-tenders/${tenderRecordId}`)
      const t = res.data
      if (t) {
        setForm({
          tenderId: t.tenderId || '',
          title: t.title || '',
          categoryId: t.categoryId || '',
          procurementType: t.procurementType || 'Works',
          districtId: t.districtId || '',
          description: t.description || '',
          estimatedValue: t.estimatedValue || t.amount || '',
          startDate: toDateInputValue(t.startDate),
          closingDate: toDateInputValue(t.closingDate || t.endDate),
          duration: t.duration || '',
          location: t.location || '',
          taluk: t.taluk || '',
          village: t.village || '',
          coordinates: (typeof (t.startLatitude ?? t.latitude) === 'number')
            ? { lat: t.startLatitude ?? t.latitude, lng: t.startLongitude ?? t.longitude, address: t.location || '' }
            : null,
          endCoordinates: (typeof t.endLatitude === 'number')
            ? { lat: t.endLatitude, lng: t.endLongitude, address: '' }
            : null,
          tenderRange: t.tenderRange != null ? String(t.tenderRange) : '',
          documentUrl: t.documentUrl || '',
          image: t.image || '',
        })
        setDocumentFile(
          t.documentUrl
            ? { name: t.documentFileName || 'tender_document.pdf', size: t.documentFileSize || null }
            : null
        )
        setLastUpdated(t.lastUpdated || t.updatedAt || null)
        setRemoteConflict(null)
        setErrors({})
        showToast('Tender synchronized with latest changes without reloading the page!')
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch latest changes.', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  // Creates the tender if it doesn't exist yet, otherwise updates it.
  // Returns the tender's DB _id either way — used both by Save and as the
  // first step of Send (a tender must exist in the DB before it can be
  // sent onward).
  async function persistTender() {
    const payload = buildPayload()

    if (tenderRecordId) {
      const res = await apiFetch(`/create-tenders/${tenderRecordId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      const updatedTender = res.data
      if (updatedTender) {
        setLastUpdated(updatedTender.updatedAt || null)
        broadcastEvent('TENDER_CHANGED', {
          id: tenderRecordId,
          tenderId: form.tenderId,
          action: 'update',
          updatedAt: updatedTender.updatedAt,
          status: updatedTender.status,
        })
      }
      return res.data._id || tenderRecordId
    }

    const res = await apiFetch('/create-tenders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const newId = res.data._id
    setTenderRecordId(newId)
    setLastUpdated(res.data.updatedAt || null)
    broadcastEvent('TENDER_CHANGED', {
      id: newId,
      tenderId: form.tenderId,
      action: 'create',
      updatedAt: res.data.updatedAt,
      status: res.data.status,
    })
    return newId
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      showToast('Please fix the highlighted fields before saving.', 'error')
      focusFirstError(e)
      return
    }
    setSaving(true)
    try {
      await persistTender()
      showToast(tenderRecordId ? 'Tender updated successfully!' : 'Tender saved as draft!')
      setTimeout(() => navigate(fromPath, { replace: true }), 1200)
    } catch (err) {
      if (err.status === 409 || err.message?.toLowerCase().includes('modified in another')) {
        setRemoteConflict({
          time: 'Just now',
          action: 'updated',
          message: err.message,
        })
      }
      showToast(err.message || 'Failed to save tender.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Send (role-aware) ───────────────────────────────────────────────────────
  // department_employee -> send-to-head
  // department_head     -> send-to-administrator
  async function handleSend() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      showToast('Please fix the highlighted fields before sending.', 'error')
      focusFirstError(e)
      return
    }

    const endpointByRole = {
      department_employee: 'send-to-head',
      department_head: 'send-to-administrator',
    }
    const action = endpointByRole[role]
    if (!action) {
      showToast('Your role cannot send tenders onward.', 'error')
      return
    }

    setSaving(true)
    try {
      // Save first (create or update) so there's a persisted Draft to send.
      const id = await persistTender()
      if (!id) {
        throw new Error('Could not persist the tender before sending. Please try Save first.')
      }
      await apiFetch(`/create-tenders/${id}/${action}`, { method: 'PATCH' })

      broadcastEvent('TENDER_CHANGED', {
        id,
        tenderId: form.tenderId,
        action: 'send',
        status: action === 'send-to-head' ? 'Sent to Head' : 'Sent to Administrator',
      })

      const label = role === 'department_employee' ? 'Department Head' : 'Administrator'
      showToast(`Tender sent to ${label} successfully!`)
      setTimeout(() => navigate('/create-saved-tenders', { replace: true }), 1200)
    } catch (err) {
      if (err.status === 409 || err.message?.toLowerCase().includes('modified in another')) {
        setRemoteConflict({
          time: 'Just now',
          action: 'updated',
          message: err.message,
        })
      }
      showToast(err.message || 'Failed to send tender.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    navigate(fromPath)
  }

  const sendLabel = role === 'department_employee' ? 'Send to Head' : 'Send to Administrator'
  const canSend = role === 'department_employee' || role === 'department_head'

  if (metaLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#FFE5BF] border-t-[#1A4A8C] rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#6B7A8D]">Loading form…</p>
      </div>
    )
  }

  if (metaError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="font-bold text-red-600 mb-1">Couldn't load the form.</p>
        <p className="text-sm text-[#6B7A8D] mb-4">{metaError}</p>
        <button
          onClick={handleBack}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 pb-10">

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className={[
          'fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold',
          'flex items-center gap-2 animate-fade-in max-w-xs',
          toast.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        ].join(' ')}>
          <span className={['w-2 h-2 rounded-full flex-shrink-0', toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'].join(' ')} />
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#FFE5BF]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-tn-navy">
              {tenderRecordId ? 'Edit Tender' : 'Create Tender'}
            </h1>
            <p className="text-sm text-tn-muted mt-0.5">
              Fill in all required fields to {tenderRecordId ? 'update' : 'submit'} the tender.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            Save
          </button>
          {canSend && (
            <button
              onClick={handleSend}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#F62440] text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {sendLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── Cross-Tab Real-time Conflict Alert Banner ─────────────────── */}
      {remoteConflict && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-base">
              ⚠️
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {remoteConflict.message || `This tender was modified in another tab ${remoteConflict.time ? `at ${remoteConflict.time}` : ''}!`}
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                {remoteConflict.status && remoteConflict.status !== 'Draft'
                  ? `Status is now "${remoteConflict.status}". Click below to sync without reloading the page.`
                  : 'To avoid losing or overwriting updates, load the newest changes directly.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
            {tenderRecordId && (
              <button
                type="button"
                onClick={handleLoadLatestChanges}
                disabled={isSyncing}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors shadow-sm disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Load Latest Changes'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setRemoteConflict(null)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-amber-300 text-amber-900 bg-white hover:bg-amber-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Section 1: Project Details ─────────────────────────────────── */}
      <FormSection title="Project Details" icon={<InfoIcon />}>
        <Field label="Tender ID" required error={errors.tenderId}>
          <input
            type="text"
            name="tenderId"
            value={form.tenderId}
            onChange={e => set('tenderId', e.target.value)}
            placeholder="e.g. TN/PWD/2026/010"
            disabled={!!tenderRecordId}
            className={tenderRecordId ? readOnlyClass : (errors.tenderId ? inputError : inputClass)}
          />
        </Field>

        <Field label="Title" required error={errors.title}>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Enter tender title"
            className={errors.title ? inputError : inputClass}
          />
        </Field>

        <Field label="Department">
          <input type="text" value={meta.department?.name || '—'} readOnly className={readOnlyClass} />
        </Field>

        <Field label="Category" required error={errors.categoryId}>
          <select name="categoryId" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}
                  className={errors.categoryId ? inputError : inputClass}>
            <option value="">Select category</option>
            {meta.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Procurement Type" required error={errors.procurementType}>
          <select
            name="procurementType"
            value={form.procurementType}
            onChange={e => set('procurementType', e.target.value)}
            className={errors.procurementType ? inputError : inputClass}
          >
            <option value="Works">Works</option>
            <option value="Goods">Goods</option>
            <option value="Services">Services</option>
          </select>
        </Field>

        <Field label="Description" required error={errors.description} fullWidth>
          <textarea
            name="description"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={4}
            placeholder="Describe the tender..."
            className={(errors.description ? inputError : inputClass) + ' resize-none'}
          />
        </Field>
      </FormSection>

      {/* ── Section 2: Financial & Schedule ─────────────────────────────── */}
      <FormSection title="Financial & Schedule" icon={<CurrencyIcon />}>
        <Field label="Estimated Value (₹)" required error={errors.estimatedValue}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#0A2240]">₹</span>
            <input
              type="number"
              name="estimatedValue"
              value={form.estimatedValue}
              onChange={e => set('estimatedValue', e.target.value)}
              placeholder="e.g. 4500000"
              className={(errors.estimatedValue ? inputError : inputClass) + ' pl-8'}
            />
          </div>
        </Field>

        <Field label="Duration">
          <input
            type="text"
            value={form.duration}
            onChange={e => handleDurationChange(e.target.value)}
            placeholder="e.g. 120 days"
            className={inputClass}
          />
        </Field>

        <Field label="Start Date" required error={errors.startDate}>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            min={toDateInputValue(new Date())}
            onChange={e => handleStartDateChange(e.target.value)}
            className={errors.startDate ? inputError : inputClass}
          />
        </Field>

        <Field label="Closing Date" required error={errors.closingDate}>
          <input
            type="date"
            name="closingDate"
            value={form.closingDate}
            min={form.startDate && form.startDate > toDateInputValue(new Date())
              ? form.startDate
              : toDateInputValue(new Date())}
            onChange={e => handleClosingDateChange(e.target.value)}
            className={errors.closingDate ? inputError : inputClass}
          />
        </Field>
      </FormSection>

      {/* ── Section 3: Project Location ────────────────────────────────── */}
      <FormSection title="Project Location" icon={<LocationIcon />}>
        <Field label="District" required error={errors.districtId}>
          <select name="districtId" value={form.districtId} onChange={e => set('districtId', e.target.value)}
                  className={errors.districtId ? inputError : inputClass}>
            <option value="">Select district</option>
            {meta.districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>

        <Field label="Location / Area" required error={errors.location}>
          <input type="text" name="location" value={form.location}
                 onChange={e => set('location', e.target.value)}
                 placeholder="e.g. Coimbatore" className={errors.location ? inputError : inputClass} />
        </Field>

        <Field label="Taluk">
          <input type="text" value={form.taluk}
                 onChange={e => set('taluk', e.target.value)}
                 placeholder="Enter taluk" className={inputClass} />
        </Field>

        <Field label="Village">
          <input type="text" value={form.village}
                 onChange={e => set('village', e.target.value)}
                 placeholder="Enter village" className={inputClass} />
        </Field>

        <Field label="Starting Coordinates (lat, long)" required error={errors.coordinates} fullWidth>
          <div name="coordinates">
            <LatLngInput
              value={form.coordinates}
              onChange={(loc) => set('coordinates', loc)}
              inputClassName={errors.coordinates ? inputError : inputClass}
            />
          </div>
        </Field>

        <Field label="Ending Coordinates (lat, long)" error={errors.endCoordinates} fullWidth>
          <div name="endCoordinates">
            <LatLngInput
              value={form.endCoordinates}
              onChange={(loc) => set('endCoordinates', loc)}
              inputClassName={errors.endCoordinates ? inputError : inputClass}
            />
          </div>
        </Field>

        <Field label="Tender Range (km)" error={errors.tenderRange} fullWidth>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                name="tenderRange"
                value={form.tenderRange}
                onChange={e => set('tenderRange', e.target.value)}
                placeholder="e.g. 15.5"
                className={(errors.tenderRange ? inputError : inputClass) + ' pr-12'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7A8D]">
                km
              </span>
            </div>
            {calculatedDist !== null && (
              <button
                type="button"
                onClick={() => set('tenderRange', String(calculatedDist))}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#FFFAF3] border border-[#FFE5BF] text-[#1A4A8C] hover:bg-[#FFF2DB] transition-colors flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                title="Populate with calculated straight-line distance"
              >
                <span>Calculated: <strong>{calculatedDist} km</strong></span>
                <span className="text-[10px] bg-[#1A4A8C] text-white px-1.5 py-0.5 rounded font-bold">Use</span>
              </button>
            )}
          </div>
        </Field>
      </FormSection>

      {/* ── Section 4: Documents ────────────────────────────────────────── */}
      <FormSection title="Documents" icon={<DocIcon />}>
        <Field label="Image URL">
          <input
            type="text"
            value={form.image}
            onChange={e => set('image', e.target.value)}
            placeholder="Image URL"
            className={inputClass}
          />
        </Field>

        <Field label="Tender Document (PDF)" error={errors.documentUrl}>
          <PdfUploadField
            fileName={documentFile?.name}
            fileSizeLabel={documentFile?.size != null ? formatFileSize(documentFile.size) : (documentFile ? 'Uploaded' : '')}
            onSelect={handlePdfSelect}
            onRemove={handlePdfRemove}
            error={errors.documentUrl}
          />
        </Field>
      </FormSection>

      {/* ── Bottom Action Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-[#FFE5BF]">
        <button
          onClick={handleBack}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] bg-white hover:bg-[#FFF2DB] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        {canSend && (
          <button
            onClick={handleSend}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#F62440] text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Sending...' : sendLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Section Icons ─────────────────────────────────────────────────────────────
const iconProps = { className: 'w-4 h-4 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }

function InfoIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function DocIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" /></svg>
}
function CurrencyIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function LocationIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}