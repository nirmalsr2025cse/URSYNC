// src/pages/ChoosePaymentPlatform.jsx
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

// ── Payment app config (name + initials + brand accent) ──────────────────────
const APPS = [
  { name: 'Google Pay', initials: 'GP', color: '#4285F4' },
  { name: 'PhonePe',    initials: 'PP', color: '#5F259F' },
  { name: 'Paytm',      initials: 'PT', color: '#00B9F1' },
  { name: 'Navi',       initials: 'NV', color: '#F97316' },
  { name: 'BHIM UPI',   initials: 'BU', color: '#0A2240' },
  { name: 'Amazon Pay', initials: 'AP', color: '#FF9900' },
]

function generateTransactionId() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `TXN${Date.now().toString().slice(-6)}${rand}`
}

export default function ChoosePaymentPlatform() {
  const navigate = useNavigate()
  const location = useLocation()

  const tenderId        = location.state?.tenderId || 'N/A'
  const tenderName      = location.state?.tenderName || 'N/A'
  const registrationFee = location.state?.registrationFee || 500
  const mobile          = location.state?.mobile || 'N/A'

  const [selectedApp, setSelectedApp] = useState(null)
  const [paying, setPaying]           = useState(false)
  const [toast, setToast]             = useState(null)
  const [dialog, setDialog]           = useState(null) // { transactionId, dateTime }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handlePay() {
    if (!selectedApp) return
    setPaying(true)
    setTimeout(() => {
      setPaying(false)
      const transactionId = generateTransactionId()
      const dateTime = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      setDialog({ transactionId, dateTime })
      showToast('Payment Successful!')
    }, 1600)
  }

  function handleContinue() {
    navigate('/apply-tenders', {
      state: {
        paymentCompleted: true,
        tenderId,
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
          <h1 className="text-xl font-display font-bold text-tn-navy">Choose Payment Platform</h1>
          <p className="text-xs text-tn-muted mt-0.5">Select your preferred payment application.</p>
        </div>
      </div>

      {/* ── Tender Info ────────────────────────────────────────────────── */}
      <Section title="Tender Information" icon={
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
            <dd className="font-bold text-[#F62440]">₹{registrationFee.toLocaleString('en-IN')}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Mobile Number</dt>
            <dd className="font-bold text-[#0A2240]">{mobile}</dd>
          </div>
        </dl>
      </Section>

      {/* ── App Selection Grid ─────────────────────────────────────────── */}
      <Section title="Payment Applications" icon={
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
      }>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {APPS.map((app) => {
            const isSelected = selectedApp === app.name
            return (
              <button
                key={app.name}
                onClick={() => setSelectedApp(app.name)}
                className={[
                  'flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all',
                  'hover:-translate-y-0.5 hover:shadow-md',
                  isSelected
                    ? 'border-[#0A2240] bg-[#FFF2DB] ring-2 ring-[#0A2240]'
                    : 'border-[#FFE5BF] bg-white hover:bg-[#FFFAF3]',
                ].join(' ')}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: app.color }}
                >
                  {app.initials}
                </div>
                <span className="text-xs font-semibold text-[#0A2240] text-center">{app.name}</span>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0A2240]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Selected
                  </span>
                )}
              </button>
            )
          })}
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
            onClick={handlePay}
            disabled={!selectedApp || paying}
            title={!selectedApp ? 'Select a payment application first' : 'Pay now'}
            className={[
              'flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold transition-all min-w-[140px]',
              !selectedApp
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                : 'bg-[#F62440] text-white hover:bg-red-600',
            ].join(' ')}
          >
            {paying ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing...
              </>
            ) : `Pay ₹${registrationFee.toLocaleString('en-IN')}`}
          </button>
        </div>
      </div>

      {/* ── Success Confirmation Dialog ────────────────────────────────── */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-[#FFE5BF] overflow-hidden">
            <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-4 bg-[#FFFAF3] border-b border-[#FFE5BF]">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-extrabold text-[#0A2240]">Payment Successful</h3>
            </div>

            <dl className="px-6 py-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7A8D]">Tender Name</dt>
                <dd className="font-semibold text-[#0A2240] text-right">{tenderName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7A8D]">Tender ID</dt>
                <dd className="font-semibold text-[#0A2240] text-right">{tenderId}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7A8D]">Paid Amount</dt>
                <dd className="font-bold text-[#F62440]">₹{registrationFee.toLocaleString('en-IN')}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7A8D]">Payment App</dt>
                <dd className="font-semibold text-[#0A2240] text-right">{selectedApp}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7A8D]">Mobile Number</dt>
                <dd className="font-semibold text-[#0A2240] text-right">{mobile}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7A8D]">Transaction ID</dt>
                <dd className="font-semibold text-[#0A2240] text-right">{dialog.transactionId}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6B7A8D]">Date & Time</dt>
                <dd className="font-semibold text-[#0A2240] text-right">{dialog.dateTime}</dd>
              </div>
            </dl>

            <div className="px-6 pb-6">
              <button
                onClick={handleContinue}
                className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#0A2240] text-white hover:bg-[#1A4A8C] transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}