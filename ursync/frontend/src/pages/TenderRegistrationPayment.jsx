// src/pages/TenderRegistrationPayment.jsx
//
// Hardened version — frontend-side edge cases covered:
//   - QR creation failure → explicit error state + "Try Again" button
//     (not left creating forever, #1/#9)
//   - QR expiry → explicit "QR Expired" state + button to generate a new
//     one, instead of polling a dead QR silently forever (#5)
//   - Amount mismatch flagged by the backend → distinct message, not
//     shown as either "paid" or "failed" (#10)
//   - Polling has a max duration (10 minutes) — after that we stop and
//     show "still waiting" with a manual refresh option, rather than
//     polling forever on an abandoned tab (#9 spinner forever)
//   - Tab visibility: polling pauses while the tab is hidden and resumes
//     (with an immediate check) when it becomes visible again, so a phone
//     lock / app switch during payment doesn't miss the result once the
//     user comes back (#9 mobile lock / incoming call / app switch)
//   - Backend-validated access via :appId in the URL (unchanged from
//     before) — blocked/expired/already-paid states rendered in place
//     without navigating away
//
// Out of scope here (see paymentController.js comment for the full list of
// what's backend-covered vs genuinely out of code's reach).

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../api/client'

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

const POLL_INTERVAL_MS = 3000
const MAX_POLL_DURATION_MS = 10 * 60 * 1000 // stop auto-polling after 10 minutes
const SUCCESS_REDIRECT_DELAY_MS = 2500

export default function TenderRegistrationPayment() {
  const navigate = useNavigate()
  const { appId: appIdParam } = useParams()
  const { apiFetch } = useApi()

  const appId = appIdParam ? decodeURIComponent(appIdParam) : null

  // ── Page-level validation state ───────────────────────────────────────────
  // 'loading' | 'blocked' | 'ready'
  const [pageState, setPageState] = useState('loading')
  const [blockReason, setBlockReason] = useState('')
  const [appInfo, setAppInfo] = useState(null)

  const [toast, setToast] = useState(null)
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadSummary = useCallback(() => {
    if (!appId) {
      setBlockReason('No application specified.')
      setPageState('blocked')
      return
    }
    setPageState('loading')
    apiFetch('/payments/application/' + encodeURIComponent(appId))
      .then((res) => {
        setAppInfo(res.data)
        setPageState('ready')
      })
      .catch((err) => {
        setBlockReason(err.message || 'This application cannot be accessed.')
        setPageState('blocked')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId])

  useEffect(() => { loadSummary() }, [loadSummary])

  // ── QR + payment status ────────────────────────────────────────────────────
  // 'idle' | 'creating' | 'pending' | 'paid' | 'expired' | 'amount_mismatch'
  // | 'create_error' | 'timed_out'
  const [qrState, setQrState] = useState('idle')
  const [qr, setQr] = useState(null)
  const [paymentId, setPaymentId] = useState(null)
  const [mismatchMessage, setMismatchMessage] = useState('')

  const pollRef = useRef(null)
  const pollStartedAtRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const createQr = useCallback(() => {
    if (!appId) return
    setQrState('creating')
    apiFetch('/payments/qr/' + encodeURIComponent(appId), { method: 'POST' })
      .then((res) => {
        setQr(res.data)
        setQrState('pending')
        pollStartedAtRef.current = Date.now()
      })
      .catch((err) => {
        setQrState('create_error')
        showToast(err.message || 'Failed to generate payment QR.', 'error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId])

  useEffect(() => {
    if (pageState === 'ready') createQr()
  }, [pageState, createQr])

  const pollOnce = useCallback(() => {
    if (!appId) return
    apiFetch('/payments/qr/' + encodeURIComponent(appId) + '/status')
      .then((res) => {
        const { status, paymentId: pid, message } = res.data
        if (status === 'paid') {
          setPaymentId(pid)
          setQrState('paid')
          stopPolling()
        } else if (status === 'expired') {
          setQrState('expired')
          stopPolling()
        } else if (status === 'amount_mismatch') {
          setMismatchMessage(message || 'Payment amount did not match the required fee.')
          setQrState('amount_mismatch')
          stopPolling()
        }
        // 'pending' / 'no_qr' → keep polling, nothing to change
      })
      .catch(() => {
        // Transient network error while polling — not fatal, try again
        // next tick rather than surfacing an error mid-payment.
      })
  }, [appId, stopPolling])

  // Poll while pending, pause when the tab is hidden, resume + immediately
  // re-check when it becomes visible again (covers phone lock / app switch
  // / incoming call during the payment).
  useEffect(() => {
    if (qrState !== 'pending') return

    function tick() {
      // Stop auto-polling after MAX_POLL_DURATION_MS so an abandoned tab
      // doesn't poll forever — surface a "still waiting" state instead.
      if (Date.now() - (pollStartedAtRef.current || Date.now()) > MAX_POLL_DURATION_MS) {
        setQrState('timed_out')
        stopPolling()
        return
      }
      pollOnce()
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        pollOnce() // immediate check on return, don't wait for the next tick
        if (!pollRef.current) pollRef.current = setInterval(tick, POLL_INTERVAL_MS)
      } else {
        stopPolling()
      }
    }

    pollRef.current = setInterval(tick, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [qrState, pollOnce, stopPolling])

  useEffect(() => {
    if (qrState !== 'paid') return
    const t = setTimeout(() => navigate('/apply-tenders', { replace: true }), SUCCESS_REDIRECT_DELAY_MS)
    return () => clearTimeout(t)
  }, [qrState, navigate])

  useEffect(() => stopPolling, [stopPolling])

  function handleRetryQr() {
    setQr(null)
    setMismatchMessage('')
    createQr()
  }

  function handleManualRefresh() {
    pollStartedAtRef.current = Date.now()
    setQrState('pending')
    pollOnce()
  }

  // ── Mobile number (pay-via-mobile — wiring done tomorrow) ─────────────────
  const [mobile, setMobile] = useState('')
  const [mobileError, setMobileError] = useState('')
  const isMobileValid = /^\d{10}$/.test(mobile)

  function handleMobileChange(e) {
    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10)
    setMobile(val)
    if (mobileError) setMobileError('')
  }

  function handleMobileNext() {
    if (!mobile.trim()) {
      setMobileError('Mobile number is required.')
      showToast('Please enter your mobile number.', 'error')
      return
    }
    if (!isMobileValid) {
      setMobileError('Enter a valid 10-digit mobile number.')
      showToast('Invalid mobile number.', 'error')
      return
    }
    navigate('/apply-tenders/payment/choose-platform/' + encodeURIComponent(appId), {
      state: { mobile },
    })
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-10 h-10 border-4 border-[#FFE5BF] border-t-[#1A4A8C] rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#6B7A8D]">Loading your application…</p>
      </div>
    )
  }

  // ── Render: blocked ─────────────────────────────────────────────────────────
  if (pageState === 'blocked') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-200">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="font-bold text-[#0A2240] mb-2 text-lg">This page isn't accessible.</p>
        <p className="text-sm text-[#6B7A8D] mb-4 max-w-sm">{blockReason}</p>
        <button
          onClick={() => navigate('/apply-tenders')}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#0A2240] text-white hover:bg-[#1A4A8C] transition-colors"
        >
          Back to Apply Tenders
        </button>
      </div>
    )
  }

  // ── Render: paid / success ──────────────────────────────────────────────────
  if (qrState === 'paid') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-200">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-bold text-[#0A2240] mb-1 text-lg">Payment Successful!</p>
        <p className="text-sm text-[#6B7A8D] mb-1">
          Your registration fee for <span className="font-semibold text-[#0A2240]">{appInfo?.tenderName}</span> has been received.
        </p>
        {paymentId && <p className="text-xs text-[#6B7A8D] mb-4">Payment ID: {paymentId}</p>}
        <p className="text-xs text-[#6B7A8D]">Redirecting you to Apply Tenders…</p>
      </div>
    )
  }

  // ── Render: amount mismatch ──────────────────────────────────────────────────
  if (qrState === 'amount_mismatch') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4 border border-amber-200">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="font-bold text-[#0A2240] mb-2 text-lg">We received a payment, but it needs review.</p>
        <p className="text-sm text-[#6B7A8D] mb-4 max-w-sm">{mismatchMessage}</p>
        <p className="text-xs text-[#6B7A8D] mb-4 max-w-sm">
          Your money is safe — don't pay again. Our team will verify and confirm your application shortly.
        </p>
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
      <div className="flex items-center gap-3 pb-4 border-b border-[#FFE5BF]">
        <button
          onClick={() => navigate('/apply-tenders')}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#FFE5BF] bg-white text-[#6B7A8D] hover:bg-[#FFF2DB] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">Tender Registration Payment</h1>
          <p className="text-sm text-tn-muted mt-0.5">
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
            <dd className="font-bold text-[#0A2240]">{appInfo?.tenderName || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Tender ID</dt>
            <dd className="font-bold text-[#0A2240]">{appInfo?.tenderCode || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Registration Fee</dt>
            <dd className="font-bold text-[#0A2240]">Tender Application Fee</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6B7A8D] mb-1">Amount</dt>
            <dd className="font-bold text-[#F62440]">
              ₹{((appInfo?.amount || 0) / 100).toLocaleString('en-IN')} (Fixed)
            </dd>
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
            {qrState === 'creating' && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-[#FFE5BF] border-t-[#1A4A8C] rounded-full animate-spin" />
                <p className="text-xs text-[#6B7A8D]">Generating QR code…</p>
              </div>
            )}

            {qrState === 'create_error' && (
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-red-500">Couldn't generate the QR code.</p>
                <button
                  onClick={handleRetryQr}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {qrState === 'expired' && (
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-600 font-semibold">This QR code has expired.</p>
                <p className="text-[11px] text-[#6B7A8D]">If you already paid, don't worry — contact support with your UPI reference. Otherwise, generate a new QR below.</p>
                <button
                  onClick={handleRetryQr}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
                >
                  Generate New QR
                </button>
              </div>
            )}

            {qrState === 'timed_out' && (
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-[#0A2240] font-semibold">Still waiting for payment.</p>
                <p className="text-[11px] text-[#6B7A8D]">If you already paid, tap below to check again.</p>
                <button
                  onClick={handleManualRefresh}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
                >
                  Check Again
                </button>
              </div>
            )}

            {qrState === 'pending' && qr?.imageUrl && (
              <img src={qr.imageUrl} alt="Scan to pay" className="w-full h-full object-contain" />
            )}
          </div>

          {qrState === 'pending' && (
            <p className="text-xs text-[#6B7A8D] text-center max-w-xs flex items-center gap-1.5">
              <svg className="w-3 h-3 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Scan using any UPI app. This updates automatically once payment is received. QR expires in {appInfo?.qrTtlMinutes || 15} minutes.
            </p>
          )}
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
            mobileError
              ? 'border-[#F62440] bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#F62440]/30'
              : 'border-[#FFE5BF] bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C]',
          ].join(' ')}
        />
        {mobileError && (
          <p className="text-[10px] text-[#F62440] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {mobileError}
          </p>
        )}

        <div className="mt-5">
          <p className="text-xs font-semibold text-[#0A2240] mb-2">Accepted Payment Platforms</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_APPS.map((app) => (
              <span key={app} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF]">
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
            onClick={handleMobileNext}
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