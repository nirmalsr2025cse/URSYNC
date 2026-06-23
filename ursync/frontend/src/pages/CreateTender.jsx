// src/pages/CreateTender.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRole } from '../components/RoleContext'
import {
  TENDER_CATEGORIES, TENDER_TYPES, PRIORITY_LEVELS,
  TN_DISTRICTS, DEPARTMENT_MAP,
} from '../data/tenderMockData'

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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CreateTender() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role }  = useRole()
  const editData  = location.state?.tender || null

  const department = DEPARTMENT_MAP[role] || 'Public Works Department'

  const [toast, setToast]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    projectName:       editData?.projectName       || '',
    department:        editData?.department        || department,
    category:          editData?.category          || '',
    tenderType:        editData?.tenderType        || '',
    shortDescription:  editData?.description       || '',
    detailedDescription: '',
    amount:            editData?.amount            || '',
    duration:          editData?.duration          || '',
    priority:          editData?.priority          || '',
    startDate:         editData?.startDate         || '',
    endDate:           editData?.endDate           || '',
    district:          editData?.district          || '',
    taluk:             editData?.taluk             || '',
    village:           editData?.village           || '',
    address:           '',
    eligibility:       '',
    technical:         '',
    resources:         '',
    notes:             '',
  })

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!form.projectName.trim())      e.projectName      = 'Project name is required.'
    if (!form.category)                e.category         = 'Please select a category.'
    if (!form.tenderType)              e.tenderType       = 'Please select a tender type.'
    if (!form.shortDescription.trim()) e.shortDescription = 'Short description is required.'
    if (!form.amount.trim())           e.amount           = 'Tender amount is required.'
    if (!form.priority)                e.priority         = 'Please select a priority.'
    if (!form.startDate)               e.startDate        = 'Start date is required.'
    if (!form.endDate)                 e.endDate          = 'End date is required.'
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      e.endDate = 'End date must be after start date.'
    }
    if (!form.district.trim())         e.district         = 'District is required.'
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
    setTimeout(() => navigate('/create-saved-tenders'), 1500)
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
            onClick={() => navigate('/create-saved-tenders')}
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

        {/* Action buttons */}
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

      {/* ── Section 1: Basic Information ───────────────────────────────── */}
      <FormSection title="Basic Information" icon={<InfoIcon />}>
        <Field label="Project Name" required error={errors.projectName}>
          <input
            type="text"
            value={form.projectName}
            onChange={e => set('projectName', e.target.value)}
            placeholder="Enter project name"
            className={errors.projectName ? inputError : inputClass}
          />
        </Field>

        <Field label="Department Name">
          <input type="text" value={form.department} readOnly className={readOnlyClass} />
        </Field>

        <Field label="Tender Category" required error={errors.category}>
          <select value={form.category} onChange={e => set('category', e.target.value)}
                  className={errors.category ? inputError : inputClass}>
            <option value="">Select category</option>
            {TENDER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Tender Type" required error={errors.tenderType}>
          <select value={form.tenderType} onChange={e => set('tenderType', e.target.value)}
                  className={errors.tenderType ? inputError : inputClass}>
            <option value="">Select type</option>
            {TENDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </FormSection>

      {/* ── Section 2: Description ─────────────────────────────────────── */}
      <FormSection title="Description" icon={<DocIcon />}>
        <Field label="Short Description" required error={errors.shortDescription} fullWidth>
          <div className="relative">
            <input
              type="text"
              value={form.shortDescription}
              onChange={e => e.target.value.length <= 50 && set('shortDescription', e.target.value)}
              placeholder="Brief summary (max 50 characters)"
              className={errors.shortDescription ? inputError : inputClass}
            />
            <span className={['absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold',
              form.shortDescription.length >= 50 ? 'text-[#F62440]' : 'text-[#6B7A8D]'].join(' ')}>
              {form.shortDescription.length}/50
            </span>
          </div>
        </Field>

        <Field label="Detailed Description" required fullWidth>
          <textarea
            value={form.detailedDescription}
            onChange={e => set('detailedDescription', e.target.value)}
            rows={5}
            placeholder="Provide complete details about the tender..."
            className={inputClass + ' resize-none'}
          />
        </Field>
      </FormSection>

      {/* ── Section 3: Tender Information ──────────────────────────────── */}
      <FormSection title="Tender Information" icon={<CurrencyIcon />}>
        <Field label="Tender Amount (₹)" required error={errors.amount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#0A2240]">₹</span>
            <input
              type="text"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="e.g. 45,00,000"
              className={(errors.amount ? inputError : inputClass) + ' pl-8'}
            />
          </div>
        </Field>

        <Field label="Estimated Duration (Days)">
          <input
            type="number"
            value={form.duration}
            onChange={e => set('duration', e.target.value)}
            placeholder="e.g. 120"
            min={1}
            className={inputClass}
          />
        </Field>

        <Field label="Project Priority" required error={errors.priority}>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}
                  className={errors.priority ? inputError : inputClass}>
            <option value="">Select priority</option>
            {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </FormSection>

      {/* ── Section 4: Application Schedule ───────────────────────────── */}
      <FormSection title="Application Schedule" icon={<CalendarIcon />}>
        <Field label="Application Start Date" required error={errors.startDate}>
          <input
            type="date"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
            className={errors.startDate ? inputError : inputClass}
          />
        </Field>

        <Field label="Application End Date" required error={errors.endDate}>
          <input
            type="date"
            value={form.endDate}
            min={form.startDate || ''}
            onChange={e => set('endDate', e.target.value)}
            className={errors.endDate ? inputError : inputClass}
          />
        </Field>
      </FormSection>

      {/* ── Section 5: Location ────────────────────────────────────────── */}
      <FormSection title="Project Location" icon={<LocationIcon />}>
        <Field label="District" required error={errors.district}>
          <select value={form.district} onChange={e => set('district', e.target.value)}
                  className={errors.district ? inputError : inputClass}>
            <option value="">Select district</option>
            {TN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>

        <Field label="Taluk">
          <input type="text" value={form.taluk}
                 onChange={e => set('taluk', e.target.value)}
                 placeholder="Enter taluk" className={inputClass} />
        </Field>

        <Field label="Village / Area">
          <input type="text" value={form.village}
                 onChange={e => set('village', e.target.value)}
                 placeholder="Enter village or area" className={inputClass} />
        </Field>

        <Field label="Full Address" fullWidth>
          <textarea value={form.address}
                    onChange={e => set('address', e.target.value)}
                    rows={3} placeholder="Enter complete address..."
                    className={inputClass + ' resize-none'} />
        </Field>
      </FormSection>

      {/* ── Section 6: Additional Requirements ────────────────────────── */}
      <FormSection title="Additional Requirements" icon={<ClipboardIcon />}>
        <Field label="Eligibility Criteria" fullWidth>
          <textarea value={form.eligibility}
                    onChange={e => set('eligibility', e.target.value)}
                    rows={3} placeholder="Specify eligibility criteria for bidders..."
                    className={inputClass + ' resize-none'} />
        </Field>

        <Field label="Technical Requirements" fullWidth>
          <textarea value={form.technical}
                    onChange={e => set('technical', e.target.value)}
                    rows={3} placeholder="List technical requirements..."
                    className={inputClass + ' resize-none'} />
        </Field>

        <Field label="Required Resources" fullWidth>
          <textarea value={form.resources}
                    onChange={e => set('resources', e.target.value)}
                    rows={3} placeholder="List required resources and materials..."
                    className={inputClass + ' resize-none'} />
        </Field>

        <Field label="Additional Notes" fullWidth>
          <textarea value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    rows={3} placeholder="Any additional notes or remarks..."
                    className={inputClass + ' resize-none'} />
        </Field>
      </FormSection>

      {/* ── Bottom Action Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-[#FFE5BF]">
        <button
          onClick={() => navigate('/create-saved-tenders')}
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
function CalendarIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}
function LocationIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function ClipboardIcon() {
  return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
}