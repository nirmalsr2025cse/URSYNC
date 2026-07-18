// src/pages/GetResourcePage.jsx
import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronRight, ArrowLeft, CheckCircle, Calendar, User,
  Building2, MapPin, FileText, Phone, Hash, AlertCircle,
  ClipboardList, Tag,
} from 'lucide-react'
import RESOURCES from '../data/resourceData.js'

const FIELDS = [
  { id:'applicantName', label:'Applicant Full Name',   icon:User,         type:'text',     placeholder:'Enter your full name',                         required:true },
  { id:'designation',   label:'Designation',           icon:User,         type:'text',     placeholder:'e.g. Assistant Executive Engineer',             required:true },
  { id:'department',    label:'Department',            icon:Building2,    type:'select',   options:['Public Works Department','Highways Department','Rural Development','TANGEDCO','TWAD Board','Chennai Corporation','Health Department','Education Department'], required:true },
  { id:'organization',  label:'Organization / Board',  icon:Building2,    type:'text',     placeholder:'e.g. Tamil Nadu PWD',                           required:true },
  { id:'district',      label:'District of Use',       icon:MapPin,       type:'select',   options:['Chennai','Coimbatore','Salem','Madurai','Tiruchirappalli','Erode','Vellore','Thanjavur','Tirunelveli','Cuddalore'], required:true },
  { id:'projectName',   label:'Project Name',          icon:ClipboardList,type:'text',     placeholder:'Name of the project',                           required:true },
  { id:'projectId',     label:'Tender / Project ID',   icon:Hash,         type:'text',     placeholder:'e.g. TN/PWD/2026/045',                          required:true },
  { id:'purpose',       label:'Purpose of Use',        icon:FileText,     type:'textarea', placeholder:'Briefly describe how this resource will be used...', required:true },
  { id:'startDate',     label:'Required From Date',    icon:Calendar,     type:'date',     required:true },
  { id:'endDate',       label:'Required Until Date',   icon:Calendar,     type:'date',     required:true },
  { id:'contactNumber', label:'Contact Number',        icon:Phone,        type:'tel',      placeholder:'10-digit mobile number',                        required:true },
  { id:'remarks',       label:'Additional Remarks',    icon:FileText,     type:'textarea', placeholder:'Any additional notes (optional)',                required:false },
]

export default function GetResourcePage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const resource   = state?.resource || RESOURCES[0]

  // Always open at the very top of the page
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [form,      setForm]      = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [errors,    setErrors]    = useState({})

  const allFilled = FIELDS.filter(f => f.required).every(f => {
    const val = form[f.id]
    return val && String(val).trim() !== ''
  })

  const handleChange = (id, value) => {
    setForm(prev => ({ ...prev, [id]: value }))
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }))
  }

  const validate = () => {
    const newErrors = {}
    FIELDS.filter(f => f.required).forEach(f => {
      if (!form[f.id] || !String(form[f.id]).trim()) newErrors[f.id] = true
    })
    if (form.startDate && form.endDate && form.endDate < form.startDate) newErrors.endDate = true
    if (form.contactNumber && !/^\d{10}$/.test(form.contactNumber.replace(/\s/g, ''))) newErrors.contactNumber = true
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleApply = () => { if (validate()) setSubmitted(true) }

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
    const refNo = `REQ/${new Date().getFullYear()}/${Math.floor(Math.random() * 90000) + 10000}`
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
              ['Reference Number', refNo,              true],
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
          <h1 className="text-lg font-extrabold text-tn-navy leading-tight">Get Resource</h1>
          <p className="text-xs text-tn-muted mt-0.5">{resource.id} · {resource.name}</p>
        </div>
      </div>

      {/* ── Full-width resource banner (same as ResourceDetailPage) ── */}
      <div className="relative w-full h-40 sm:h-52 overflow-hidden bg-tn-navy">
        <img
          src={resource.image}
          alt={resource.name}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 flex items-center px-4 sm:px-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <img
              src={resource.image}
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
                  <MapPin size={11} />{resource.district}
                </span>
                <span className="font-bold text-yellow-300">
                  ₹{resource.dailyRate.toLocaleString('en-IN')}/day
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
            {FIELDS.map(field => (
              <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-[10px] font-bold text-tn-muted uppercase tracking-widest mb-1.5">
                  {field.label}
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
                      className={inputClass(field.id)}
                    />
                  </div>
                )}

                {errors[field.id] && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {field.id === 'endDate'       ? 'End date must be after start date.'
                      : field.id === 'contactNumber' ? 'Enter a valid 10-digit number.'
                      : `${field.label} is required.`}
                  </p>
                )}
              </div>
            ))}
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
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleApply}
              disabled={!allFilled}
              className={[
                'flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2',
                allFilled
                  ? 'bg-tn-blue hover:bg-tn-navy text-white shadow-md hover:shadow-lg active:scale-[0.98]'
                  : 'bg-tn-blue text-white opacity-30 blur-[1px] cursor-not-allowed pointer-events-none select-none',
              ].join(' ')}
            >
              <CheckCircle size={16} /> Apply for Resource
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