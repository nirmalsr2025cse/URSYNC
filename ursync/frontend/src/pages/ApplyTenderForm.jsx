// src/pages/ApplyTenderForm.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { APPLY_TENDERS } from '../data/applyTenderMockData'

// ── Helpers ───────────────────────────────────────────────────────────────────
function isDeadlinePassed(deadline) {
  return new Date(deadline) < new Date()
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className={[
      'fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold',
      'flex items-center gap-2 max-w-xs',
      isError
        ? 'bg-red-50 text-red-700 border border-red-200'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ].join(' ')}>
      <span className={[
        'w-2 h-2 rounded-full flex-shrink-0',
        isError ? 'bg-red-500' : 'bg-emerald-500',
      ].join(' ')} />
      {toast.msg}
    </div>
  )
}

// ── Section Wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
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
function Field({ label, required, error, full, children }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-[#0A2240] mb-1.5">
        {label}{required && <span className="text-[#F62440] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[10px] text-[#F62440] mt-1 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

const iconProps = {
  className: 'w-4 h-4 text-white',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
}

// ── Main Form ─────────────────────────────────────────────────────────────────
export default function ApplyTenderForm() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const tenderId   = location.state?.tenderId
  const tender     = APPLY_TENDERS.find((t) => t.id === tenderId)
  const isClosed   = tender ? isDeadlinePassed(tender.applicationDeadline) : false

  const [frozen,  setFrozen]  = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)
  const [errors,  setErrors]  = useState({})

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Section 1 — Applicant
    applicantName:      '',
    fatherName:         '',
    companyName:        '',
    companyRegNo:       '',
    gstNumber:          '',
    panNumber:          '',
    email:              '',
    mobile:             '',
    alternateMobile:    '',
    userId:             '',
    address:            '',
    district:           '',
    state:              'Tamil Nadu',
    pinCode:            '',
    // Section 2 — Tender (pre-filled, read-only)
    tenderId:           tender?.id             || '',
    tenderName:         tender?.projectName    || '',
    department:         tender?.department     || '',
    tenderCategory:     tender?.category       || '',
    tenderType:         tender?.tenderType     || '',
    projectLocation:    tender?.location       || '',
    projectDuration:    tender?.projectDuration?.toString() || '',
    bidValidity:        tender?.bidValidity?.toString()     || '',
    bidAmount:          '',
    emdAmount:          tender?.emdAmount      || '',
    securityDeposit:    '',
    experienceYears:    '',
    prevGovtProjects:   '',
    technicalQual:      '',
    financialCapacity:  '',
    // Section 3 — Declaration
    acceptTerms:        false,
    digitalSignature:   '',
    applicantSignature: '',
    declarationDate:    '',
    remarks:            '',
  })

  function set(key, val) {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const REQUIRED = [
    'applicantName', 'companyName', 'companyRegNo', 'gstNumber',
    'panNumber', 'email', 'mobile', 'address', 'district', 'pinCode',
    'bidAmount', 'declarationDate',
  ]

  function validate() {
    const e = {}
    REQUIRED.forEach((key) => {
      if (!form[key] || !form[key].toString().trim()) e[key] = 'This field is required.'
    })
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      e.email = 'Enter a valid email address.'
    }
    if (form.mobile && !/^\d{10}$/.test(form.mobile.replace(/\s/g, ''))) {
      e.mobile = 'Enter a valid 10-digit mobile number.'
    }
    if (form.bidAmount && parseFloat(form.bidAmount.replace(/,/g, '')) <= 0) {
      e.bidAmount = 'Bid amount must be greater than zero.'
    }
    if (!form.acceptTerms) {
      e.acceptTerms = 'You must accept the terms and conditions.'
    }
    return e
  }

  // ── All required fields filled? (for enabling Freeze button) ─────────────
  const isFormComplete = REQUIRED.every((key) =>
    form[key] && form[key].toString().trim() !== ''
  ) && form.acceptTerms

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      showToast('Please fill all required fields.', 'error')
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    showToast('Application Saved Successfully!')
  }

  // ── Freeze ────────────────────────────────────────────────────────────────
  async function handleFreeze() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      showToast('Please fill all required fields before freezing.', 'error')
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setFrozen(true)
    showToast('Application Frozen Successfully!')
  }

  // ── Unfreeze ──────────────────────────────────────────────────────────────
  function handleUnfreeze() {
    setFrozen(false)
    showToast('Application Unfrozen. You can now edit.')
  }

  // ── Input class ───────────────────────────────────────────────────────────
  function inputCls(errKey, readOnly = false) {
    const isReadOnly = readOnly || frozen || isClosed
    return [
      'w-full px-4 py-2.5 text-sm rounded-xl border transition-all',
      isReadOnly
        ? 'bg-[#FFF2DB] text-[#6B7A8D] border-[#FFE5BF] cursor-not-allowed select-none'
        : errors[errKey]
          ? 'border-[#F62440] bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#F62440]/30'
          : 'border-[#FFE5BF] bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C]',
    ].join(' ')
  }

  if (!tender) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="font-bold text-[#0A2240] mb-2 text-lg">Tender not found.</p>
        <p className="text-sm text-[#6B7A8D] mb-4">The tender you are looking for does not exist.</p>
        <button
          onClick={() => navigate('/apply-tenders')}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#0A2240] text-white hover:bg-[#1A4A8C] transition-colors"
        >
          Back to Apply Tenders
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <Toast toast={toast} />

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#FFE5BF]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/apply-tenders')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#0A2240]">Apply Tender</h1>
            <p className="text-xs text-[#6B7A8D] mt-0.5 line-clamp-1">{tender.projectName}</p>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {isClosed && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              Application Closed
            </span>
          )}
          {frozen && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              🔒 Frozen
            </span>
          )}
          {!isClosed && !frozen && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF]">
              Deadline: {new Date(tender.applicationDeadline).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* ── Closed warning ─────────────────────────────────────────────── */}
      {isClosed && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-red-700">Application period has expired.</p>
            <p className="text-xs text-red-600 mt-0.5">This application can no longer be modified.</p>
          </div>
        </div>
      )}

      {/* ── Frozen notice ──────────────────────────────────────────────── */}
      {frozen && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-amber-700">Application is frozen.</p>
            <p className="text-xs text-amber-600 mt-0.5">Click Unfreeze to make changes.</p>
          </div>
        </div>
      )}

      {/* ── Section 1: Applicant Information ──────────────────────────── */}
      <Section title="Applicant Information" icon={
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      }>
        <Field label="Applicant Name" required error={errors.applicantName}>
          <input value={form.applicantName} onChange={(e) => set('applicantName', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="Full name"
                 className={inputCls('applicantName')} />
        </Field>
        <Field label="Father Name">
          <input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="Father's full name"
                 className={inputCls('')} />
        </Field>
        <Field label="Company Name" required error={errors.companyName}>
          <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="Registered company name"
                 className={inputCls('companyName')} />
        </Field>
        <Field label="Company Registration No." required error={errors.companyRegNo}>
          <input value={form.companyRegNo} onChange={(e) => set('companyRegNo', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="e.g. U12345TN2020PTC123456"
                 className={inputCls('companyRegNo')} />
        </Field>
        <Field label="GST Number" required error={errors.gstNumber}>
          <input value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="e.g. 33AABCU9603R1ZT"
                 className={inputCls('gstNumber')} />
        </Field>
        <Field label="PAN Number" required error={errors.panNumber}>
          <input value={form.panNumber} onChange={(e) => set('panNumber', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="e.g. ABCDE1234F"
                 className={inputCls('panNumber')} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="company@email.com"
                 className={inputCls('email')} />
        </Field>
        <Field label="Mobile Number" required error={errors.mobile}>
          <input value={form.mobile} onChange={(e) => set('mobile', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="10-digit mobile number"
                 className={inputCls('mobile')} />
        </Field>
        <Field label="Alternate Mobile">
          <input value={form.alternateMobile} onChange={(e) => set('alternateMobile', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="Alternate contact number"
                 className={inputCls('')} />
        </Field>
        <Field label="User ID">
          <input value={form.userId} onChange={(e) => set('userId', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="Portal user ID"
                 className={inputCls('')} />
        </Field>
        <Field label="Address" required error={errors.address} full>
          <textarea value={form.address} onChange={(e) => set('address', e.target.value)}
                    readOnly={frozen || isClosed} rows={3}
                    placeholder="Registered office address"
                    className={inputCls('address') + ' resize-none'} />
        </Field>
        <Field label="District" required error={errors.district}>
          <input value={form.district} onChange={(e) => set('district', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="District"
                 className={inputCls('district')} />
        </Field>
        <Field label="State">
          <input value={form.state} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="PIN Code" required error={errors.pinCode}>
          <input value={form.pinCode} onChange={(e) => set('pinCode', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="6-digit PIN code"
                 className={inputCls('pinCode')} />
        </Field>
      </Section>

      {/* ── Section 2: Tender Details ──────────────────────────────────── */}
      <Section title="Tender Details" icon={
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
      }>
        <Field label="Tender ID">
          <input value={form.tenderId} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="Tender Name">
          <input value={form.tenderName} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="Department">
          <input value={form.department} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="Tender Category">
          <input value={form.tenderCategory} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="Tender Type">
          <input value={form.tenderType} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="Project Location">
          <input value={form.projectLocation} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="Project Duration (Days)">
          <input value={form.projectDuration} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="Bid Validity (Days)">
          <input value={form.bidValidity} readOnly className={inputCls('', true)} />
        </Field>
        <Field label="Bid Amount (₹)" required error={errors.bidAmount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0A2240]">₹</span>
            <input value={form.bidAmount} onChange={(e) => set('bidAmount', e.target.value)}
                   readOnly={frozen || isClosed} placeholder="e.g. 4,50,00,000"
                   className={inputCls('bidAmount') + ' pl-8'} />
          </div>
        </Field>
        <Field label="EMD Amount (₹)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0A2240]">₹</span>
            <input value={form.emdAmount} onChange={(e) => set('emdAmount', e.target.value)}
                   readOnly={frozen || isClosed} placeholder="Earnest money deposit"
                   className={inputCls('') + ' pl-8'} />
          </div>
        </Field>
        <Field label="Security Deposit (₹)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0A2240]">₹</span>
            <input value={form.securityDeposit} onChange={(e) => set('securityDeposit', e.target.value)}
                   readOnly={frozen || isClosed} placeholder="Security deposit amount"
                   className={inputCls('') + ' pl-8'} />
          </div>
        </Field>
        <Field label="Experience (Years)">
          <input type="number" min={0} value={form.experienceYears}
                 onChange={(e) => set('experienceYears', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="Years of relevant experience"
                 className={inputCls('')} />
        </Field>
        <Field label="Previous Govt Projects" full>
          <textarea value={form.prevGovtProjects} onChange={(e) => set('prevGovtProjects', e.target.value)}
                    readOnly={frozen || isClosed} rows={3}
                    placeholder="List previous government projects with values..."
                    className={inputCls('') + ' resize-none'} />
        </Field>
        <Field label="Technical Qualification" full>
          <textarea value={form.technicalQual} onChange={(e) => set('technicalQual', e.target.value)}
                    readOnly={frozen || isClosed} rows={3}
                    placeholder="Describe technical qualifications and certifications..."
                    className={inputCls('') + ' resize-none'} />
        </Field>
        <Field label="Financial Capacity" full>
          <textarea value={form.financialCapacity} onChange={(e) => set('financialCapacity', e.target.value)}
                    readOnly={frozen || isClosed} rows={3}
                    placeholder="Describe financial capacity and turnover..."
                    className={inputCls('') + ' resize-none'} />
        </Field>
      </Section>

      {/* ── Section 3: Documents ───────────────────────────────────────── */}
      <Section title="Documents" icon={
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      }>
        {[
          'PAN Card Upload',
          'GST Certificate Upload',
          'Registration Certificate',
          'Experience Certificate',
          'Financial Statement',
          'Technical Proposal',
          'Commercial Proposal',
          'Additional Documents',
        ].map((doc) => (
          <Field key={doc} label={doc}>
            <div className={[
              'w-full px-4 py-2.5 text-sm rounded-xl border border-[#FFE5BF]',
              'flex items-center gap-2',
              frozen || isClosed
                ? 'bg-[#FFF2DB] cursor-not-allowed'
                : 'bg-white cursor-pointer hover:bg-[#FFF2DB] transition-colors',
            ].join(' ')}>
              <svg className="w-4 h-4 text-[#1A4A8C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span className="text-[#6B7A8D] text-xs">
                {frozen || isClosed ? 'No file uploaded' : 'Click to upload'}
              </span>
            </div>
          </Field>
        ))}
      </Section>

      {/* ── Section 4: Declaration ─────────────────────────────────────── */}
      <Section title="Declaration" icon={
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }>
        <Field label="Accept Terms & Conditions" required error={errors.acceptTerms} full>
          <label className={['flex items-start gap-3', frozen || isClosed ? 'cursor-not-allowed' : 'cursor-pointer'].join(' ')}>
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => !frozen && !isClosed && set('acceptTerms', e.target.checked)}
              disabled={frozen || isClosed}
              className="mt-0.5 w-4 h-4 accent-[#0A2240]"
            />
            <span className="text-xs text-[#6B7A8D] leading-relaxed">
              I hereby declare that all information provided is true and correct to the best of my knowledge.
              I accept all terms and conditions of this tender application and agree to abide by the rules.
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-[10px] text-[#F62440] mt-1">{errors.acceptTerms}</p>
          )}
        </Field>
        <Field label="Digital Signature">
          <input value={form.digitalSignature} onChange={(e) => set('digitalSignature', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="Digital signature ID"
                 className={inputCls('')} />
        </Field>
        <Field label="Applicant Signature">
          <input value={form.applicantSignature} onChange={(e) => set('applicantSignature', e.target.value)}
                 readOnly={frozen || isClosed} placeholder="Full name as signature"
                 className={inputCls('')} />
        </Field>
        <Field label="Date" required error={errors.declarationDate}>
          <input type="date" value={form.declarationDate}
                 onChange={(e) => set('declarationDate', e.target.value)}
                 readOnly={frozen || isClosed}
                 className={inputCls('declarationDate')} />
        </Field>
        <Field label="Remarks" full>
          <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)}
                    readOnly={frozen || isClosed} rows={3}
                    placeholder="Any additional remarks or notes..."
                    className={inputCls('') + ' resize-none'} />
        </Field>
      </Section>

      {/* ── Sticky Bottom Action Bar ───────────────────────────────────── */}
      <div className="mt-8 bg-white border border-[#FFE5BF] rounded-2xl shadow-sm px-4 py-3 lg:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Left — form completion hint */}
          <div className="flex items-center gap-2">
            {!isFormComplete && !frozen && !isClosed && (
              <p className="text-xs text-[#6B7A8D]">
                Fill all required fields to enable{' '}
                <span className="font-semibold text-[#F62440]">Freeze</span>.
              </p>
            )}
            {isFormComplete && !frozen && !isClosed && (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All required fields filled. Ready to freeze.
              </p>
            )}
          </div>

          {/* Right — action buttons */}
          <div className="flex items-center gap-2 w-auto">

            {/* Cancel → Back after freeze */}
            <button
              onClick={() => navigate('/apply-tenders')}
              className="px-5 py-2 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] bg-white hover:bg-[#FFF2DB] transition-colors"
            >
              {frozen ? '← Back' : 'Cancel'}
            </button>

            {/* Save — disabled when frozen */}
            {!frozen && (
              <button
                onClick={handleSave}
                disabled={isClosed || saving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving...
                  </>
                ) : 'Save'}
              </button>
            )}

            {/* Freeze / Unfreeze */}
            {!frozen ? (
              <button
                onClick={handleFreeze}
                disabled={!isFormComplete || isClosed || saving}
                title={!isFormComplete ? 'Fill all required fields to freeze' : 'Freeze application'}
                className={[
                  'flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  !isFormComplete || isClosed
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                    : 'bg-[#F62440] text-white hover:bg-red-600',
                ].join(' ')}
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Freezing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Freeze
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleUnfreeze}
                disabled={isClosed}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Unfreeze
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}