// src/pages/Signup.jsx
//
// Standalone signup page for the E-procurement Dashboard — mirrors
// Login.jsx's structure, styling, and validation approach so the two
// pages feel like one product. Not nested inside the authenticated
// Dashboard shell, so it works as its own route (e.g. "/signup").
//
// ─────────────────────────────────────────────────────────────────────────
// SECURITY NOTE — read before wiring this to a real backend:
// The suspicious-input lockout below is a *frontend UX layer*. It catches
// careless or casual bad input and gives the user clear, immediate
// feedback. It is NOT a substitute for backend validation. A real NoSQL
// injection attempt never touches this component's JS — it goes straight
// to your API. Your Node/Express + MongoDB backend must independently:
//   - reject any body where fields aren't plain strings
//   - sanitize request bodies (e.g. express-mongo-sanitize middleware)
//   - hash passwords with bcrypt/argon2, never store plaintext
//   - rate-limit signup attempts server-side per IP
//   - re-validate department against an allow-list server-side
//   - re-validate district against an allow-list server-side
//   - re-validate mobile number format server-side
// Treat everything below as "good citizen" UX, not a security control.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react'

// ── Suspicious-input detection (same list as Login.jsx) ────────────────
const SUSPICIOUS_PATTERNS = [
  { test: /^\s*\$/, reason: 'Starts with $' },
  { test: /\$(ne|eq|gt|gte|lt|lte|in|nin|or|and|not|nor|exists|regex|where|expr|type|mod|all|elemMatch|size)\b/i, reason: 'MongoDB operator keyword' },
  { test: /[{}[\]]/, reason: 'Object/array syntax' },
  { test: /<\s*script/i, reason: 'Script tag' },
  { test: /javascript\s*:/i, reason: 'javascript: protocol' },
  { test: /on\w+\s*=/i, reason: 'Inline event handler' },
  { test: /\$\{|\{\{|\}\}/, reason: 'Template injection syntax' },
  { test: /--|;--|\bunion\s+select\b|\bdrop\s+table\b/i, reason: 'SQL-like syntax' },
  { test: /'\s*or\s*'?\s*1\s*'?\s*=\s*'?\s*1/i, reason: 'SQL tautology pattern' },
  { test: /[\x00-\x08\x0B\x0C\x0E-\x1F]/, reason: 'Control characters' },
]

const NAME_MAX_LEN = 100
const NAME_MIN_LEN = 3
const EMAIL_MAX_LEN = 254
const PHONE_LEN = 10
const PASSWORD_MAX_LEN = 128
const PASSWORD_MIN_LEN = 6

const MAX_VIOLATIONS = 3
const LOCK_DURATION_MS = 30_000

const LS_LOCK_UNTIL = 'ep_signup_lock_until'
const LS_VIOLATIONS = 'ep_signup_violations'

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback // private browsing / storage disabled — degrade quietly
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore — lockout just won't persist across a refresh in this case
  }
}

// Checks one field's raw value. Returns null when clean, or a short
// user-facing reason string when it trips a pattern.
function checkSuspicious(value) {
  if (!value) return null
  for (const { test, reason } of SUSPICIOUS_PATTERNS) {
    if (test.test(value)) return reason
  }
  return null
}

// ── Field format validation (only runs on submit, same timing as Login) ─
const GOV_EMAIL_REGEX = /^[^\s@]+@(?:[a-zA-Z0-9-]+\.)*tn\.gov\.in$/i
const PHONE_REGEX = /^[6-9]\d{9}$/ // 10-digit Indian mobile number, starts 6-9

function checkEmailFormat(value) {
  if (!value) return null
  return GOV_EMAIL_REGEX.test(value)
    ? null
    : 'Enter a valid @tn.gov.in email address (e.g. name@department.tn.gov.in).'
}

function checkPhoneFormat(value) {
  if (!value) return null
  return PHONE_REGEX.test(value)
    ? null
    : 'Enter a valid 10-digit mobile number.'
}

function checkPasswordFormat(value) {
  if (!value) return null
  return value.length < PASSWORD_MIN_LEN
    ? `Invalid password. Must be at least ${PASSWORD_MIN_LEN} characters.`
    : null
}

function checkNameFormat(value) {
  if (!value) return null
  return value.trim().length < NAME_MIN_LEN
    ? `Name must be at least ${NAME_MIN_LEN} characters.`
    : null
}

// ── Small inline icons (no icon-library dependency, shared style with Login) ─
function IconEye({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 9.88a3 3 0 104.24 4.24" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.73 5.08A10.43 10.43 0 0112 5c7 0 10 7 10 7a13.16 13.16 0 01-1.67 2.68" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.61 6.61A13.526 13.526 0 002 12s3 7 10 7a9.74 9.74 0 005.39-1.61" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 2l20 20" />
    </svg>
  )
}

function IconLock({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5V7.5a4.5 4.5 0 019 0v3" />
    </svg>
  )
}

function IconAlert({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.7 17.5A1.8 1.8 0 004.3 20h15.4a1.8 1.8 0 001.6-2.5L13.7 3.9a1.8 1.8 0 00-3.4 0z" />
    </svg>
  )
}

function IconShield({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l7 3v5.2c0 4.6-3 7.7-7 8.8-4-1.1-7-4.2-7-8.8V6.5l7-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2.2 2.2L15.5 9.5" />
    </svg>
  )
}

function IconClock({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3.2 2" />
    </svg>
  )
}

function IconUsers({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8.5" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 9a2.5 2.5 0 100-5M20.5 19c0-2.4-1.7-4.2-4-4.8" />
    </svg>
  )
}

function IconDocument({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5h7l4 4V19a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 19V5A1.5 1.5 0 017.5 3.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3.5V8h4M9 12.5h6M9 15.5h6M9 9.5h2" />
    </svg>
  )
}

// Small phone icon for the mobile number field
function IconPhone({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
    </svg>
  )
}

// Small map-pin icon for the new district field
function IconMapPin({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LedgerMark({ className }) {
  return (
    <svg viewBox="0 0 220 220" fill="none" className={className} aria-hidden="true">
      <rect x="40" y="66" width="104" height="132" rx="8" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
      <rect x="56" y="48" width="104" height="132" rx="8" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <rect x="72" y="30" width="104" height="132" rx="8" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
      <line x1="90" y1="56" x2="158" y2="56" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="90" y1="72" x2="158" y2="72" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="90" y1="88" x2="136" y2="88" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="160" cy="140" r="30" fill="#0B2545" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M147 140l8 8 18-19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Signature element: integrity check strip, same as Login.jsx ────────
function IntegrityStrip({ state, secondsLeft }) {
  const config = {
    clear: { dot: 'bg-emerald-500', text: 'Input integrity check: clear' },
    flagged: { dot: 'bg-amber-500', text: 'Input integrity check: suspicious pattern blocked' },
    locked: { dot: 'bg-red-500', text: `Input integrity check: locked — retry in ${secondsLeft}s` },
  }[state]

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono text-tn-muted select-none">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      {config.text}
    </div>
  )
}

const BRAND_FEATURES = [
  { Icon: IconShield, text: 'Encrypted, fully auditable bid submissions' },
  { Icon: IconClock, text: 'Real-time tender status & deadline tracking' },
  { Icon: IconUsers, text: 'Verified vendor and department accounts' },
]

// Departments shown in the signup form. Swap for a fetched list from your
// backend if the department set changes independently of the frontend.
const DEPARTMENTS = [
  'Public Works Department',
  'Health & Family Welfare',
  'Municipal Administration',
  'Highways & Minor Ports',
  'Agriculture Engineering',
  'School Education',
  'Rural Development',
  'Information Technology',
]

// Districts shown in the signup form. This MUST stay in sync with the
// `name` field of documents in your backend's District collection —
// authController.js resolves whatever string is submitted here against
// that collection and rejects anything that doesn't match.
const DISTRICTS = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Salem',
  'Tirunelveli',
  'Erode',
  'Vellore',
  'Thoothukudi',
  'Thanjavur',
  'Dindigul',
  'Kanchipuram',
  'Cuddalore',
]

export default function Signup({ onSubmit, onGoToLogin }) {
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [district, setDistrict] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [fieldErrors, setFieldErrors] = useState({ name: '', department: '', district: '', email: '', phone: '', password: '' })
  const [formError, setFormError] = useState('')
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [shake, setShake] = useState(false)

  const [violations, setViolations] = useState(() => readStorage(LS_VIOLATIONS, 0))
  const [lockUntil, setLockUntil] = useState(() => readStorage(LS_LOCK_UNTIL, 0))
  const [now, setNow] = useState(() => Date.now())

  const nameRef = useRef(null)
  const tickRef = useRef(null)

  const isLocked = lockUntil > now
  const secondsLeft = isLocked ? Math.ceil((lockUntil - now) / 1000) : 0

  useEffect(() => {
    if (!isLocked) {
      clearInterval(tickRef.current)
      return
    }
    tickRef.current = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tickRef.current)
  }, [isLocked])

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const registerViolation = useCallback(() => {
    setViolations((prev) => {
      const next = prev + 1
      writeStorage(LS_VIOLATIONS, next)
      if (next >= MAX_VIOLATIONS) {
        const until = Date.now() + LOCK_DURATION_MS
        setLockUntil(until)
        writeStorage(LS_LOCK_UNTIL, until)
        writeStorage(LS_VIOLATIONS, 0) // reset counter once locked
        return 0
      }
      return next
    })
    setShake(true)
    window.setTimeout(() => setShake(false), 420)
  }, [])

  function handleNameChange(e) {
    const raw = e.target.value.slice(0, NAME_MAX_LEN)
    setName(raw)
    const reason = checkSuspicious(raw)
    if (reason) {
      setFieldErrors((prev) => ({ ...prev, name: `That's not allowed here (${reason.toLowerCase()}).` }))
      registerViolation()
    } else {
      setFieldErrors((prev) => ({ ...prev, name: '' }))
    }
  }

  function handleDepartmentChange(e) {
    setDepartment(e.target.value)
    setFieldErrors((prev) => ({ ...prev, department: '' }))
  }

  function handleDistrictChange(e) {
    setDistrict(e.target.value)
    setFieldErrors((prev) => ({ ...prev, district: '' }))
  }

  function handleEmailChange(e) {
    const raw = e.target.value.slice(0, EMAIL_MAX_LEN)
    setEmail(raw)
    const reason = checkSuspicious(raw)
    if (reason) {
      setFieldErrors((prev) => ({ ...prev, email: `That's not allowed here (${reason.toLowerCase()}).` }))
      registerViolation()
    } else {
      // Email-format is only re-checked on submit (see handleSubmit), not
      // on every keystroke, so nothing is flagged until they click Sign up.
      setFieldErrors((prev) => ({ ...prev, email: '' }))
    }
  }

  // Digits-only, capped at 10 — same "validate on submit, not on
  // keystroke" timing as the other fields, except we do strip non-digits
  // live since a phone field with letters in it is never valid anyway.
  function handlePhoneChange(e) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, PHONE_LEN)
    setPhone(digitsOnly)
    const reason = checkSuspicious(digitsOnly)
    if (reason) {
      setFieldErrors((prev) => ({ ...prev, phone: `That's not allowed here (${reason.toLowerCase()}).` }))
      registerViolation()
    } else {
      setFieldErrors((prev) => ({ ...prev, phone: '' }))
    }
  }

  function handlePasswordChange(e) {
    const raw = e.target.value.slice(0, PASSWORD_MAX_LEN)
    setPassword(raw)
    const reason = checkSuspicious(raw)
    if (reason) {
      setFieldErrors((prev) => ({ ...prev, password: `That's not allowed here (${reason.toLowerCase()}).` }))
      registerViolation()
    } else {
      setFieldErrors((prev) => ({ ...prev, password: '' }))
    }
  }

  function handlePasswordKeyUp(e) {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isLocked || submitting) return

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedPassword = password.trim()

    const nameSuspicious = checkSuspicious(trimmedName)
    const emailSuspicious = checkSuspicious(trimmedEmail)
    const phoneSuspicious = checkSuspicious(trimmedPhone)
    const pwSuspicious = checkSuspicious(trimmedPassword)

    // Only worth checking format once we know it's not already flagged as
    // suspicious, so the two error types never fight over the same field.
    const nameFormatReason = !nameSuspicious ? checkNameFormat(trimmedName) : null
    const emailFormatReason = !emailSuspicious ? checkEmailFormat(trimmedEmail) : null
    const phoneFormatReason = !phoneSuspicious ? checkPhoneFormat(trimmedPhone) : null
    const pwFormatReason = !pwSuspicious ? checkPasswordFormat(trimmedPassword) : null

    const nextErrors = {
      name: !trimmedName
        ? 'Enter your full name.'
        : nameSuspicious
          ? `That's not allowed here (${nameSuspicious.toLowerCase()}).`
          : nameFormatReason || '',
      department: !department ? 'Select your department.' : '',
      district: !district ? 'Select your district.' : '',
      email: !trimmedEmail
        ? 'Enter your email address.'
        : emailSuspicious
          ? `That's not allowed here (${emailSuspicious.toLowerCase()}).`
          : emailFormatReason || '',
      phone: !trimmedPhone
        ? 'Enter your mobile number.'
        : phoneSuspicious
          ? `That's not allowed here (${phoneSuspicious.toLowerCase()}).`
          : phoneFormatReason || '',
      password: !trimmedPassword
        ? 'Enter a password.'
        : pwSuspicious
          ? `That's not allowed here (${pwSuspicious.toLowerCase()}).`
          : pwFormatReason || '',
    }
    setFieldErrors(nextErrors)

    if (nameSuspicious || emailSuspicious || phoneSuspicious || pwSuspicious) {
      registerViolation()
      return
    }
    if (nextErrors.name || nextErrors.department || nextErrors.district || nextErrors.email || nextErrors.phone || nextErrors.password) {
      setShake(true)
      window.setTimeout(() => setShake(false), 420)
      return
    }

    setFormError('')
    setSubmitting(true)
    try {
      // Values are always sent as explicit strings — never interpolated
      // into a query or rendered as HTML. Wire this up to your real
      // MongoDB-backed auth endpoint (e.g. POST /api/auth/signup); the
      // backend must still perform its own type-checking, sanitization,
      // department allow-list validation, district allow-list validation,
      // and phone format validation regardless of what's already been
      // checked here.
      if (onSubmit) {
        await onSubmit({
          name: String(trimmedName),
          department: String(department),
          district: String(district),
          email: String(trimmedEmail),
          phone: String(trimmedPhone),
          password: String(trimmedPassword),
        })
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 900))
        console.log('[Signup] onSubmit not provided — simulated request only. Wire this to your auth API.')
      }
    } catch (err) {
      setFormError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const integrityState = isLocked
    ? 'locked'
    : (fieldErrors.name || fieldErrors.department || fieldErrors.district || fieldErrors.email || fieldErrors.phone || fieldErrors.password)
      ? 'flagged'
      : 'clear'

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col lg:flex-row bg-tn-cream">
      <style>{`
        @keyframes signupShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .signup-shake { animation: signupShake 0.42s ease-in-out; }
        }
        @keyframes signupFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .signup-fade-in { animation: signupFadeIn 0.5s ease-out; }
        }
      `}</style>

      {/* Identity header — mobile & tablet only */}
      <header className="lg:hidden relative overflow-hidden bg-tn-navy text-white">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 34px, currentColor 34px, currentColor 35px)',
          }}
          aria-hidden="true"
        />
        <div className="relative px-6 sm:px-10 pt-8 pb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-xs">TN</span>
            </div>
            <div>
              <p className="font-display font-bold text-base leading-tight">Tamil Nadu Government</p>
              <p className="text-[11px] text-white/60">Tenders &amp; e-Procurement Portal</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/70 max-w-xs">
            Create your account to manage tenders, bids, and awards.
          </p>
        </div>
      </header>

      {/* Branding panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-tn-navy text-white flex-col justify-between p-10">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 34px, currentColor 34px, currentColor 35px)',
          }}
          aria-hidden="true"
        />

        <LedgerMark className="absolute -bottom-8 -right-16 w-40 h-40 text-white opacity-10 pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-sm">TN</span>
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-tight">Tamil Nadu Government</p>
            <p className="text-xs text-white/60">Tenders &amp; e-Procurement Portal</p>
          </div>
        </div>

        <div className="relative space-y-5 max-w-sm">
          <p className="text-2xl font-display font-bold leading-snug">
            Create your account to manage tenders, bids, and awards.
          </p>
          <p className="text-sm text-white/60">தமிழ்நாடு அரசு</p>

          <ul className="space-y-3 pt-1">
            {BRAND_FEATURES.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/70">
                <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative space-y-3 max-w-sm">
          <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/10">
            <div className="flex items-start gap-2.5">
              <IconDocument className="w-[18px] h-[18px] text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold">8,65,773</p>
                <p className="text-[11px] text-white/50">Tenders&nbsp;published&nbsp;since&nbsp;2007</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <IconUsers className="w-[18px] h-[18px] text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold">52,860</p>
                <p className="text-[11px] text-white/50">Registered bidders</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-white/35">A Government of Tamil Nadu digital initiative</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className={`w-full max-w-sm signup-fade-in ${shake ? 'signup-shake' : ''}`}>
          <h1 className="text-2xl font-display font-bold text-tn-navy">Create account</h1>
          <p className="text-sm text-tn-muted mt-1 mb-7">Register for e-Procurement dashboard access.</p>

          {isLocked ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col items-center text-center gap-2" role="alert">
              <IconLock className="w-7 h-7 text-red-500" />
              <p className="font-semibold text-red-700 text-sm">Sign-up temporarily locked</p>
              <p className="text-xs text-red-600/80 max-w-[22rem]">
                Repeated invalid input was detected. Try again in {secondsLeft}s, using only normal name, department, district, email, phone, and password values.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-semibold text-tn-navy mb-1.5">
                    Full name
                  </label>
                  <input
                    id="signup-name"
                    ref={nameRef}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={handleNameChange}
                    disabled={submitting}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
                    className={`w-full px-3.5 py-3 text-sm rounded-xl border bg-white text-tn-navy placeholder-tn-muted transition-colors focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue disabled:opacity-60 ${
                      fieldErrors.name ? 'border-red-300' : 'border-tn-border'
                    }`}
                    placeholder="e.g. Nirmal S R"
                  />
                  {fieldErrors.name && (
                    <p id="signup-name-error" className="mt-1.5 text-xs text-red-600">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-department" className="block text-xs font-semibold text-tn-navy mb-1.5">
                    Department
                  </label>
                  <select
                    id="signup-department"
                    value={department}
                    onChange={handleDepartmentChange}
                    disabled={submitting}
                    aria-invalid={!!fieldErrors.department}
                    aria-describedby={fieldErrors.department ? 'signup-department-error' : undefined}
                    className={`w-full px-3.5 py-3 text-sm rounded-xl border bg-white text-tn-navy transition-colors focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue disabled:opacity-60 ${
                      fieldErrors.department ? 'border-red-300' : 'border-tn-border'
                    } ${department === '' ? 'text-tn-muted' : ''}`}
                  >
                    <option value="" disabled>Select your department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} className="text-tn-navy">{dept}</option>
                    ))}
                  </select>
                  {fieldErrors.department && (
                    <p id="signup-department-error" className="mt-1.5 text-xs text-red-600">{fieldErrors.department}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-district" className="block text-xs font-semibold text-tn-navy mb-1.5">
                    District
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tn-muted pointer-events-none">
                      <IconMapPin className="w-4 h-4" />
                    </span>
                    <select
                      id="signup-district"
                      value={district}
                      onChange={handleDistrictChange}
                      disabled={submitting}
                      aria-invalid={!!fieldErrors.district}
                      aria-describedby={fieldErrors.district ? 'signup-district-error' : undefined}
                      className={`w-full pl-9 pr-3.5 py-3 text-sm rounded-xl border bg-white text-tn-navy transition-colors focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue disabled:opacity-60 ${
                        fieldErrors.district ? 'border-red-300' : 'border-tn-border'
                      } ${district === '' ? 'text-tn-muted' : ''}`}
                    >
                      <option value="" disabled>Select your district</option>
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d} className="text-tn-navy">{d}</option>
                      ))}
                    </select>
                  </div>
                  {fieldErrors.district && (
                    <p id="signup-district-error" className="mt-1.5 text-xs text-red-600">{fieldErrors.district}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-tn-navy mb-1.5">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={submitting}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
                    className={`w-full px-3.5 py-3 text-sm rounded-xl border bg-white text-tn-navy placeholder-tn-muted transition-colors focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue disabled:opacity-60 ${
                      fieldErrors.email ? 'border-red-300' : 'border-tn-border'
                    }`}
                    placeholder="you@department.tn.gov.in"
                  />
                  {fieldErrors.email && (
                    <p id="signup-email-error" className="mt-1.5 text-xs text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-phone" className="block text-xs font-semibold text-tn-navy mb-1.5">
                    Mobile number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tn-muted pointer-events-none">
                      <IconPhone className="w-4 h-4" />
                    </span>
                    <input
                      id="signup-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      disabled={submitting}
                      aria-invalid={!!fieldErrors.phone}
                      aria-describedby={fieldErrors.phone ? 'signup-phone-error' : undefined}
                      className={`w-full pl-9 pr-3.5 py-3 text-sm rounded-xl border bg-white text-tn-navy placeholder-tn-muted transition-colors focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue disabled:opacity-60 ${
                        fieldErrors.phone ? 'border-red-300' : 'border-tn-border'
                      }`}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p id="signup-phone-error" className="mt-1.5 text-xs text-red-600">{fieldErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-xs font-semibold text-tn-navy mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={handlePasswordChange}
                      onKeyUp={handlePasswordKeyUp}
                      disabled={submitting}
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
                      className={`w-full px-3.5 py-3 pr-11 text-sm rounded-xl border bg-white text-tn-navy placeholder-tn-muted transition-colors focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue disabled:opacity-60 ${
                        fieldErrors.password ? 'border-red-300' : 'border-tn-border'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-tn-muted hover:text-tn-navy transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <IconEye open={showPassword} />
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="signup-password-error" className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>
                  )}
                  {capsLockOn && !fieldErrors.password && (
                    <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                      <IconAlert className="w-3.5 h-3.5 flex-shrink-0" />
                      Caps Lock is on.
                    </p>
                  )}
                </div>

                {formError && (
                  <p role="alert" className="text-xs text-red-600 flex items-center gap-1.5">
                    <IconAlert className="w-3.5 h-3.5 flex-shrink-0" />
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors disabled:opacity-60"
                >
                  {submitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {submitting ? 'Creating account…' : 'Sign up'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-tn-border">
            <IntegrityStrip state={integrityState} secondsLeft={secondsLeft} />
          </div>
        </div>
      </div>

      {/* Trust footer — mobile & tablet only */}
      <footer className="lg:hidden border-t border-tn-border bg-white/60 px-5 sm:px-10 py-6 overflow-hidden">
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
          <div className="flex items-start gap-2 min-w-0">
            <IconDocument className="w-[18px] h-[18px] text-tn-navy/40 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-tn-navy truncate">8,65,773</p>
              <p className="text-[11px] text-tn-muted leading-snug">Tenders published since 2007</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <IconUsers className="w-[18px] h-[18px] text-tn-navy/40 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-tn-navy truncate">52,860</p>
              <p className="text-[11px] text-tn-muted leading-snug">Registered bidders</p>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-tn-muted/70 mt-4">A Government of Tamil Nadu digital initiative</p>
      </footer>
    </div>
  )
}