// src/pages/CreateTender.jsx
// Fields collected here map 1:1 to what TenderDetailsView/TenderView
// display: title, department (derived), category, description,
// estimatedValue, startDate, closingDate, duration, location, taluk,
// village, latitude/longitude, documentUrl, image.
// No projectName/tenderType/priority/amount(currency-string)/eligibility/
// technical/resources/notes — those belonged to the old mock draft-workflow
// and aren't shown anywhere in the details view.

import React, { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRole } from '../components/RoleContext'
import LatLngInput from '../components/LatLngInput'
import { TENDER_CATEGORIES, TN_DISTRICTS, DEPARTMENT_MAP } from '../data/tenderMockData'

const MAX_PDF_SIZE_MB = 10

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
  const editData  = location.state?.tender || null

  const department = DEPARTMENT_MAP[role] || 'Public Works Department'
  const fromPath = location.state?.fromPath || '/create-saved-tenders'

  const [toast, setToast]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // ── Form state — mirrors exactly what TenderDetailsView displays ──────────
  const [form, setForm] = useState({
    title:            editData?.title            || '',
    department:       editData?.department        || department,
    category:         editData?.category          || '',
    description:      editData?.description       || '',
    estimatedValue:    editData?.estimatedValue    || '',
    startDate:        editData?.startDate         || '',
    closingDate:      editData?.closingDate       || '',
    duration:         editData?.duration          || '',
    location:         editData?.location          || '',
    taluk:            editData?.taluk             || '',
    village:          editData?.village           || '',
    // Holds { address, lat, lng, placeId } once selected — user never
    // types coordinates directly.
    coordinates:      (editData && typeof editData.latitude === 'number')
      ? { lat: editData.latitude, lng: editData.longitude, address: editData.location || '' }
      : null,
    // documentUrl still ends up as a URL/data-URI string — TenderView's
    // DownloadButton just needs any href it can point <a> at.
    documentUrl:      editData?.documentUrl       || '',
    image:            editData?.image             || '',
  })

  // File metadata shown in the upload widget (kept separate from form.documentUrl
  // so we can show a nice filename/size chip without depending on data-URI parsing).
  const [documentFile, setDocumentFile] = useState(
    editData?.documentUrl ? { name: editData.documentFileName || 'Existing document.pdf', size: null } : null
  )

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
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
    if (!form.title.trim())          e.title          = 'Title is required.'
    if (!form.category)              e.category       = 'Please select a category.'
    if (!form.description.trim())    e.description    = 'Description is required.'
    if (!form.estimatedValue.toString().trim()) e.estimatedValue = 'Estimated value is required.'
    if (!form.startDate)             e.startDate      = 'Start date is required.'
    if (!form.closingDate)           e.closingDate    = 'Closing date is required.'
    if (form.startDate && form.closingDate && form.closingDate <= form.startDate) {
      e.closingDate = 'Closing date must be after start date.'
    }
    if (!form.location.trim())       e.location       = 'Location is required.'
    if (!form.coordinates)           e.coordinates    = 'Please select a location from the suggestions.'
    return e
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    showToast(editData ? 'Tender updated successfully!' : 'Tender saved as draft!')
    setTimeout(() => navigate(fromPath), 1500)
  }

  // ── Send ────────────────────────────────────────────────────────────────────
  async function handleSend() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    const label = role === 'department_employee' ? 'Department Head' : 'Administrator'
    showToast('Tender sent to ' + label + ' successfully!')
    setTimeout(() => navigate('/create-saved-tenders'), 1500)
  }

  function handleBack() {
    navigate(fromPath)
  }

  const sendLabel = role === 'department_employee' ? 'Send to Head' : 'Send to Administrator'

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
            <h1 className="text-xl font-extrabold text-[#0A2240]">
              {editData ? 'Edit Tender' : 'Create Tender'}
            </h1>
            <p className="text-xs text-[#6B7A8D] mt-0.5">
              Fill in all required fields to {editData ? 'update' : 'submit'} the tender.
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
        </div>
      </div>

      {/* ── Section 1: Project Details ─────────────────────────────────── */}
      <FormSection title="Project Details" icon={<InfoIcon />}>
        <Field label="Title" required error={errors.title}>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Enter tender title"
            className={errors.title ? inputError : inputClass}
          />
        </Field>

        <Field label="Department">
          <input type="text" value={form.department} readOnly className={readOnlyClass} />
        </Field>

        <Field label="Category" required error={errors.category}>
          <select value={form.category} onChange={e => set('category', e.target.value)}
                  className={errors.category ? inputError : inputClass}>
            <option value="">Select category</option>
            {TENDER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Description" required error={errors.description} fullWidth>
          <textarea
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
            onChange={e => set('duration', e.target.value)}
            placeholder="e.g. 120 days"
            className={inputClass}
          />
        </Field>

        <Field label="Start Date" required error={errors.startDate}>
          <input
            type="date"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
            className={errors.startDate ? inputError : inputClass}
          />
        </Field>

        <Field label="Closing Date" required error={errors.closingDate}>
          <input
            type="date"
            value={form.closingDate}
            min={form.startDate || ''}
            onChange={e => set('closingDate', e.target.value)}
            className={errors.closingDate ? inputError : inputClass}
          />
        </Field>
      </FormSection>

      {/* ── Section 3: Project Location ────────────────────────────────── */}
      <FormSection title="Project Location" icon={<LocationIcon />}>
        <Field label="District" required error={errors.location}>
          <select value={form.location} onChange={e => set('location', e.target.value)}
                  className={errors.location ? inputError : inputClass}>
            <option value="">Select district</option>
            {TN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
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

        <Field label="Coordinates (lat, long)" required error={errors.coordinates} fullWidth>
          <LatLngInput
            value={form.coordinates}
            onChange={(loc) => set('coordinates', loc)}
            inputClassName={errors.coordinates ? inputError : inputClass}
          />
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
        <button
          onClick={handleSend}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#F62440] text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Sending...' : sendLabel}
        </button>
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