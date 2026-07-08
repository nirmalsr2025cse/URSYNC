// src/pages/TenderRegistrationPayment.jsx
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

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

// ── Section Wrapper (matches ApplyTenderForm) ─────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#FFE5BF] bg-[#FFFAF3]">
        <div className="w-8 h-8 rounded-lg bg-[#0A2240] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-[#0A2240]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const iconProps = {
  className: 'w-4 h-4 text-white',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
}

const PAYMENT_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'Navi', 'BHIM UPI', 'Amazon Pay', 'Other UPI Apps']

export default function TenderRegistrationPayment() {
  const navigate = useNavigate()
  const location = useLocation()

  const tenderId   = location.state?.tenderId || 'N/A'
  const tenderName = location.state?.formData?.tenderName || location.state?.tenderName || 'N/A'
  const REGISTRATION_FEE = 500

  const [mobile, setMobile]   = useState('')
  const [error, setError]     = useState('')
  const [toast, setToast]     = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleMobileChange(e) {
    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10)
    setMobile(val)
    if (error) setError('')
  }

  const isMobileValid = /^\d{10}$/.test(mobile)

  function handleNext() {
    if (!mobile.trim()) {
      setError('Mobile number is required.')
      showToast('Please enter your mobile number.', 'error')
      return
    }
    if (!isMobileValid) {
      setError('Enter a valid 10-digit mobile number.')
      showToast('Invalid mobile number.', 'error')
      return
    }
    navigate('/apply-tenders/payment/choose-platform', {
      state: {
        tenderId,
        tenderName,
        registrationFee: REGISTRATION_FEE,
        mobile,
      },
    })
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <Toast toast={toast} />

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#FFE5BF]">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Tender Registration Payment</h1>
          <p className="text-xs text-[#6B7A8D] mt-0.5">
            Complete the registration fee payment to submit your tender application.
          </p>
        </div>
      </div>

      {/* ── Payment Summary ────────────────────────────────────────────── */}
      <Section title="Payment Summary" icon={
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
      }>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Tender Name</dt>
            <dd className="font-bold text-[#0A2240]">{tenderName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Tender ID</dt>
            <dd className="font-bold text-[#0A2240]">{tenderId}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Registration Fee</dt>
            <dd className="font-bold text-[#0A2240]">Tender Application Fee</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Amount</dt>
            <dd className="font-bold text-[#F62440]">₹{REGISTRATION_FEE.toLocaleString('en-IN')} (Fixed)</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Payment Status</dt>
            <dd>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Pending
              </span>
            </dd>
          </div>
        </dl>
      </Section>

      {/* ── QR Code ────────────────────────────────────────────────────── */}
      <Section title="Pay via QR Code" icon={
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 4h6m-3-4v6" />
        </svg>
      }>
        <div className="flex flex-col items-center gap-3 py-2 max-w-md mx-auto">
          <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border border-[#FFE5BF] bg-[#FFFAF3] flex items-center justify-center p-4">
            {/* Placeholder QR image */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-[#0A2240]">
              <rect x="0" y="0" width="100" height="100" fill="white" />
              {Array.from({ length: 10 }).map((_, r) =>
                Array.from({ length: 10 }).map((_, c) => (
                  ((r + c) % 3 === 0 || (r * c) % 7 === 0) && (
                    <rect key={`${r}-${c}`} x={c * 10} y={r * 10} width="10" height="10" fill="currentColor" />
                  )
                ))
              )}
              <rect x="0" y="0" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="70" y="0" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="0" y="70" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
          </div>
          <p className="text-xs text-[#6B7A8D] text-center max-w-xs">
            Scan this QR Code using any supported UPI application.
          </p>
        </div>
      </Section>

      {/* ── Mobile Number ──────────────────────────────────────────────── */}
      <Section title="Pay via Mobile Number" icon={
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      }>
        <label className="block text-xs font-semibold text-[#0A2240] mb-1.5">
          Mobile Number<span className="text-[#F62440] ml-0.5">*</span>
        </label>
        <input
          value={mobile}
          onChange={handleMobileChange}
          inputMode="numeric"
          placeholder="Enter 10-digit mobile number"
          className={[
            'w-full sm:w-96 px-4 py-2.5 text-sm rounded-xl border transition-all',
            error
              ? 'border-[#F62440] bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#F62440]/30'
              : 'border-[#FFE5BF] bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C]',
          ].join(' ')}
        />
        {error && (
          <p className="text-[10px] text-[#F62440] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </p>
        )}

        {/* Accepted Platforms */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-[#0A2240] mb-2">Accepted Payment Platforms</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_APPS.map((app) => (
              <span
                key={app}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF]"
              >
                {app}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Bottom Action Bar ──────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl shadow-sm px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] bg-white hover:bg-[#FFF2DB] transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={!isMobileValid}
            title={!isMobileValid ? 'Enter a valid mobile number to continue' : 'Proceed'}
            className={[
              'flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
              !isMobileValid
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                : 'bg-[#F62440] text-white hover:bg-red-600',
            ].join(' ')}
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}