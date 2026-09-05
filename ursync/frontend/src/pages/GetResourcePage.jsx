// src/pages/GetResourcePage.jsx
import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronRight, ArrowLeft, CheckCircle, Calendar, User,
  Building2, MapPin, FileText, Phone, Hash, AlertCircle,
  ClipboardList, Tag,
} from 'lucide-react'
import { useApi } from '../api/client'

const FIELDS = [
  { id:'startDate',     label:'Required From Date',    icon:Calendar,     type:'date',     required:true },
  { id:'endDate',       label:'Required Until Date',   icon:Calendar,     type:'date',     required:true },
  { id:'requiredQuantity', label:'Resources Required', icon:ClipboardList, type:'number', placeholder:'Enter quantity', required:true },
  { id:'applicantName', label:'Applicant Full Name',   icon:User,         type:'text',     placeholder:'Enter your full name',                         required:true },
  { id:'designation',   label:'Designation',           icon:User,         type:'text',     placeholder:'e.g. Assistant Executive Engineer',             required:true },
  { id:'department',    label:'Department',            icon:Building2,    type:'select',   options:['Public Works Department','Highways Department','Rural Development','TANGEDCO','TWAD Board','Chennai Corporation','Health Department','Education Department'], required:true },
  { id:'organization',  label:'Organization / Board',  icon:Building2,    type:'text',     placeholder:'e.g. Tamil Nadu PWD',                           required:true },
  { id:'district',      label:'District of Use',       icon:MapPin,       type:'select',   options:['Chennai','Coimbatore','Salem','Madurai','Tiruchirappalli','Erode','Vellore','Thanjavur','Tirunelveli','Cuddalore'], required:true },
  { id:'projectName',   label:'Project Name',          icon:ClipboardList,type:'text',     placeholder:'Name of the project',                           required:true },
  { id:'projectId',     label:'Tender / Project ID',   icon:Hash,         type:'text',     placeholder:'e.g. TN/PWD/2026/045',                          required:true },
  { id:'purpose',       label:'Purpose of Use',        icon:FileText,     type:'textarea', placeholder:'Briefly describe how this resource will be used...', required:true },
  { id:'contactNumber', label:'Contact Number',        icon:Phone,        type:'tel',      placeholder:'10-digit mobile number',                        required:true },
  { id:'remarks',       label:'Additional Remarks',    icon:FileText,     type:'textarea', placeholder:'Any additional notes (optional)',                required:false },
]

// Returns tomorrow's date in YYYY-MM-DD format
const toISODate = (d) => d.toISOString().split('T')[0]

const getMinStartDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toISODate(d)
}

const getMinEndDate = (startDate) => {
  if (!startDate) return undefined
  return startDate
}

export default function GetResourcePage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const { apiFetch } = useApi()
  const resource   = state?.resource
  const district = resource?.district?.name || resource?.district?.code || resource?.district || 'Not specified'
  const [availability, setAvailability] = useState(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  // Always open at the very top of the page
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!resource) navigate('/search-resource', { replace: true })
  }, [navigate, resource])

  const [form,      setForm]      = useState({
    startDate: state?.startDate || '',
    endDate: state?.endDate || '',
  })
  const [errors,    setErrors]    = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [requestId, setRequestId] = useState('')

  const availableUnits = availability?.availableQuantity ?? resource?.available ?? 0
  const datesValid = Boolean(form.startDate && form.endDate && form.startDate <= form.endDate)

  useEffect(() => {
    if (!datesValid) {
      setAvailability(null)
      return undefined
    }
    const controller = new AbortController()
    if (!resource) return undefined
    const params = new URLSearchParams({ requiredFrom: form.startDate, requiredTo: form.endDate })
    setAvailabilityLoading(true)
    apiFetch(`/resources/${resource._id || resource.id}/availability?${params}`, { signal: controller.signal })
      .then(setAvailability)
      .catch(err => {
        if (err.name !== 'AbortError') setSubmitError(err.message || 'Failed to calculate availability.')
      })
      .finally(() => setAvailabilityLoading(false))
    return () => controller.abort()
  }, [apiFetch, resource, form.startDate, form.endDate, datesValid])

  if (!resource) return null

  const minStartDate = getMinStartDate()
  const minEndDate = getMinEndDate(form.startDate)

  const allFilled = FIELDS.filter(f => f.required).every(f => {
    const val = form[f.id]
    return val && String(val).trim() !== ''
  }) && datesValid

  const handleChange = (id, value) => {
    setForm(prev => {
      const next = { ...prev, [id]: value }
      if (id === 'startDate' && prev.endDate && prev.endDate < value) {
        next.endDate = ''
      }
      return next
    })
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: undefined }))
  }

  const validate = () => {
    const newErrors = {}
    FIELDS.filter(f => f.required).forEach(f => {
      if (!form[f.id] || !String(form[f.id]).trim()) {
        newErrors[f.id] = `${f.label} is required.`
      }
    })

    if (!form.startDate) {
      newErrors.startDate = 'Please select Required From date.'
    }
    if (!form.endDate) {
      newErrors.endDate = 'Please select Required To date.'
    } else if (form.startDate && form.endDate < form.startDate) {
      newErrors.endDate = 'Required From date cannot be after Required To date.'
    }

    const qty = Number(form.requiredQuantity)
    if (!form.requiredQuantity || !Number.isInteger(qty) || qty <= 0) {
      newErrors.requiredQuantity = 'Quantity must be a positive number.'
    } else if (qty > (resource.available || 0)) {
      newErrors.requiredQuantity = 'Requested quantity exceeds the total resource quantity.'
    } else if (datesValid && availability && qty > availableUnits) {
      newErrors.requiredQuantity = `Only ${availableUnits} resources are available for the selected date range.`
    }

    if (form.contactNumber && !/^\d{10}$/.test(form.contactNumber.replace(/\s/g, ''))) {
      newErrors.contactNumber = 'Enter a valid 10-digit number.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleApply = async () => {
    if (!validate() || submitting) return

    setSubmitError('')
    setSubmitting(true)
    try {
      const data = await apiFetch(`/resources/${resource._id || resource.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          requiredFrom: form.startDate,
          requiredTo: form.endDate,
          requiredQuantity: Number(form.requiredQuantity),
          applicantName: form.applicantName.trim(),
          designation: form.designation.trim(),
          department: form.department,
          organization: form.organization.trim(),
          district: form.district,
          projectName: form.projectName.trim(),
          projectId: form.projectId.trim(),
          purpose: form.purpose.trim(),
          contactNumber: form.contactNumber.replace(/\s/g, ''),
          remarks: (form.remarks || '').trim(),
        }),
      })
      setRequestId(data.requestId || '')
      navigate('/applied-resources', { replace: true })
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit the resource request.')
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    navigate(-1)
  }

  const goTo = (path, opts) => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    navigate(path, opts)
  }

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-tn-cream flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl border border-tn-border shadow-sm p-8 sm:p-12 text-center max-w-[600px] w-full">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-tn-navy mb-2">Request Submitted!</h2>
          <p className="text-sm text-tn-muted mb-6">
            Your resource request has been submitted successfully and is pending approval.
          </p>
          <div className="bg-tn-cream rounded-xl border border-tn-border p-5 mb-6 text-left space-y-3">
            {[
              ['Request ID',         requestId,         true],
              ['Resource',         resource.name,      false],
              ['Applicant',        form.applicantName, false],
              ['Department',       form.department,    false],
              ['Period',           `${form.startDate} → ${form.endDate}`, false],
              ['Status',           'Pending Approval', false],
            ].map(([label, value, mono]) => (
              <div key={label} className="flex flex-col sm:flex-row sm:justify-between text-sm gap-0.5 sm:gap-4">
                <span className="text-tn-muted font-medium">{label}</span>
                <span className={`font-bold break-all ${label === 'Status' ? 'text-amber-600' : mono ? 'text-tn-blue font-mono' : 'text-tn-navy'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => goTo('/search-resource')}
              className="flex-1 py-3 rounded-xl bg-tn-blue hover:bg-tn-navy text-white text-sm font-bold transition-colors active:scale-[0.98]"
            >
              Search More Resources
            </button>
            <button
              onClick={() => goTo('/')}
              className="flex-1 py-3 rounded-xl border border-tn-border text-tn-navy text-sm font-semibold hover:bg-tn-light transition-colors active:scale-[0.98]"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Form screen ── */
  const inputClass = (id) =>
    `w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue transition-all ${
      errors[id] ? 'border-red-400 bg-red-50' : 'border-tn-border bg-white'
    }`

  return (
    <div className="min-h-screen bg-tn-cream animate-fade-in">

      {/* ── Back header — chevron + title + id, same as ResourceDetailPage ── */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-tn-navy active:opacity-60 transition-opacity"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="mt-1 pl-1">
          <h1 className="text-xl font-display font-bold text-tn-navy leading-tight">Get Resource</h1>
          <p className="text-sm text-tn-muted mt-0.5">{resource._id || resource.id} · {resource.name}</p>
        </div>
      </div>

      {/* ── Full-width resource banner (same as ResourceDetailPage) ── */}
      <div className="relative w-full h-40 sm:h-52 overflow-hidden bg-tn-navy">
        <img
          src={resource.image || ''}
          alt={resource.name}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 flex items-center px-4 sm:px-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <img
              src={resource.image || ''}
              alt={resource.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0 border-2 border-white/30 shadow-lg"
            />
            <div className="min-w-0">
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-0.5">
                Requesting Resource
              </p>
              <h2 className="text-white text-xl sm:text-2xl font-extrabold leading-tight">
                {resource.name}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-blue-200">
                <span className="flex items-center gap-1">
                  <Tag size={11} />{resource.category}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={11} />{district}
                </span>
                <span className="font-bold text-yellow-300">
                  Daily rate not specified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form content ── */}
      <div className="px-4 sm:px-8 py-6 mx-auto space-y-5 pb-12">

        {/* Notice */}
        <div className="bg-tn-amber border border-tn-gold rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-tn-warn flex-shrink-0 mt-0.5" />
          <p className="text-xs text-tn-navy">
            All fields marked <span className="text-red-600 font-bold">*</span> are mandatory.
            The <strong>Apply</strong> button will only be enabled after all required fields are filled.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-tn-border shadow-sm p-5 sm:p-8">
          <h2 className="text-base font-extrabold text-tn-navy mb-6 flex items-center gap-2">
            <ClipboardList size={18} className="text-tn-blue" /> Resource Request Form
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FIELDS.map(field => {
              const isEndDate = field.id === 'endDate'
              const isStartDate = field.id === 'startDate'
              const endDateLocked = isEndDate && !form.startDate

              return (
              <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-[10px] font-bold text-tn-muted uppercase tracking-widest mb-1.5">
                  {field.id === 'requiredQuantity' ? `${field.label} (${availableUnits} available)` : field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'select' ? (
                  <div className="relative">
                    <field.icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tn-muted pointer-events-none" />
                    <select
                      value={form[field.id] || ''}
                      onChange={e => handleChange(field.id, e.target.value)}
                      className={inputClass(field.id) + ' appearance-none'}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={form[field.id] || ''}
                    onChange={e => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue transition-all resize-none ${errors[field.id] ? 'border-red-400 bg-red-50' : 'border-tn-border'}`}
                  />
                ) : (
                  <div className="relative">
                    <field.icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tn-muted pointer-events-none" />
                    <input
                      type={field.type}
                      value={form[field.id] || ''}
                      onChange={e => handleChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      min={
                        field.id === 'requiredQuantity' ? 1
                          : isStartDate ? minStartDate
                          : isEndDate ? minEndDate
                          : undefined
                      }
                      max={field.id === 'requiredQuantity' && datesValid ? availableUnits : undefined}
                      disabled={field.id === 'requiredQuantity' ? !datesValid || availabilityLoading : endDateLocked}
                      title={endDateLocked ? 'Please choose the "Required From" date first' : undefined}
                      className={inputClass(field.id) + (endDateLocked ? ' opacity-50 cursor-not-allowed' : '')}
                    />
                  </div>
                )}

                {isEndDate && endDateLocked && !errors[field.id] && (
                  <p className="text-[11px] text-tn-muted mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    Choose the "Required From" date first.
                  </p>
                )}

                {errors[field.id] && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {typeof errors[field.id] === 'string' ? errors[field.id] : `${field.label} is required.`}
                  </p>
                )}
              </div>
            )})}
          </div>

          {/* Declaration */}
          <div className="mt-6 bg-tn-cream rounded-xl border border-tn-border p-4">
            <p className="text-xs text-tn-muted leading-relaxed">
              <span className="font-bold text-tn-navy">Declaration: </span>
              I hereby declare that the information provided is true and correct. I understand that
              the resource will be used solely for the government project mentioned above and will
              be returned in the same condition.
            </p>
          </div>

          {/* Submit */}
          {submitError && (
            <p className="mt-4 text-sm text-red-600 text-center">{submitError}</p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleApply}
              disabled={!allFilled || submitting}
              className={[
                'flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2',
                allFilled && !submitting
                  ? 'bg-tn-blue hover:bg-tn-navy text-white shadow-md hover:shadow-lg active:scale-[0.98]'
                  : 'bg-tn-blue text-white opacity-30 blur-[1px] cursor-not-allowed pointer-events-none select-none',
              ].join(' ')}
            >
              <CheckCircle size={16} /> {submitting ? 'Submitting...' : 'Apply for Resource'}
            </button>
            <button
              onClick={goBack}
              className="flex-1 py-3.5 rounded-xl border border-tn-border text-tn-navy text-sm font-semibold hover:bg-tn-light transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <ArrowLeft size={15} /> Cancel
            </button>
          </div>

          {!allFilled && (
            <p className="text-xs text-tn-muted text-center mt-3 flex items-center justify-center gap-1">
              <AlertCircle size={12} /> Fill all required fields to enable the Apply button.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}