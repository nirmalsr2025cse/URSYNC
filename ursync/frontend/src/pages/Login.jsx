// src/pages/Login.jsx
//
// Standalone login page for the E-procurement Dashboard — not nested
// inside the authenticated Dashboard shell (no DashboardSidebar/Navbar
// dependency), so it works as its own route (e.g. "/login").
//
// ─────────────────────────────────────────────────────────────────────────
// SECURITY NOTE — read before wiring this to a real backend:
// The suspicious-input lockout below is a *frontend UX layer*. It catches
// careless or casual bad input and gives the user clear, immediate
// feedback. It is NOT a substitute for backend validation. A real NoSQL
// injection attempt (e.g. POSTing raw JSON like
// {"username":{"$ne":null},"password":{"$ne":null}}, or form-encoded
// "username[$ne]=" which some body-parsers turn into a nested object)
// never touches this component's JS — it goes straight to your API.
// Your Node/Express + MongoDB backend must independently:
//   - reject any body where username/password aren't plain strings
//     (e.g. `if (typeof username !== 'string') return res.status(400)...`)
//   - sanitize request bodies (e.g. express-mongo-sanitize middleware)
//   - hash + compare passwords with bcrypt/argon2, never store plaintext
//   - rate-limit login attempts server-side per IP/account (this file's
//     lockout is easily bypassed by clearing localStorage or calling the
//     API directly, so it must not be relied on as the only limiter)
// Treat everything below as "good citizen" UX, not a security control.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react'

// ── Suspicious-input detection ──────────────────────────────────────────
// Each pattern targets a specific, well-known injection style. This list
// is intentionally not exhaustive — regex pattern-matching never is —
// it's a deterrent/UX layer, not a security boundary (see note above).
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

const IDENTIFIER_MAX_LEN = 254 // practical email-length cap
const PASSWORD_MAX_LEN = 128
const PASSWORD_MIN_LEN = 6

const MAX_VIOLATIONS = 3
const LOCK_DURATION_MS = 30_000

const LS_LOCK_UNTIL = 'ep_login_lock_until'
const LS_VIOLATIONS = 'ep_login_violations'

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

// ── Identifier format validation ────────────────────────────────────────
// This portal only accepts official Tamil Nadu government addresses — the
// identifier must end in tn.gov.in (e.g. name@tn.gov.in or
// name@department.tn.gov.in, with any number of department subdomains in
// between). A perfectly well-formed email on another domain, such as
// nirmal@gmail.com, is still rejected, since it isn't a *.tn.gov.in
// account. This only runs on submit (see handleSubmit), so nothing is
// flagged while the user is still typing.
const GOV_EMAIL_REGEX = /^[^\s@]+@(?:[a-zA-Z0-9-]+\.)*tn\.gov\.in$/i

function checkIdentifierFormat(value) {
  if (!value) return null
  return GOV_EMAIL_REGEX.test(value)
    ? null
    : 'Enter a valid @tn.gov.in email address (e.g. name@department.tn.gov.in).'
}

// Same submit-only timing as checkIdentifierFormat above — nothing is
// flagged while the user is still typing, only once they click Sign in.
function checkPasswordFormat(value) {
  if (!value) return null
  return value.length < PASSWORD_MIN_LEN
    ? `Invalid password. Must be at least ${PASSWORD_MIN_LEN} characters.`
    : null
}

// ── Small inline icons (no icon-library dependency) ─────────────────────
function IconEye({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4.5 h-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4.5 h-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M6.6 6.7C4.5 8.1 3 12 3 12s3.5 7 9.5 7c1.9 0 3.5-.6 4.8-1.4M17.4 15.5c1.8-1.5 3.1-3.5 3.1-3.5s-1-2-2.6-3.6" />
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

// Icons used on the branding panel below (value-prop list + stat labels).
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

// Signature mark for the branding panel: a stack of tender documents under
// an approval seal. It's the one deliberate decorative flourish on the
// page, kept quiet (low opacity, single color) and tied directly to the
// e-procurement subject matter rather than generic ornament.
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

// ── Signature element: a quiet, functional "integrity check" strip ─────
// Reads like an audit-log line rather than a decorative badge — its state
// (clear / flagged / locked) is directly driven by the real detection
// logic above, not just for show.
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

export default function Login({ onSubmit, onForgotPassword }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)

  const [fieldErrors, setFieldErrors] = useState({ identifier: '', password: '' })
  const [formError, setFormError] = useState('')
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [shake, setShake] = useState(false)

  const [violations, setViolations] = useState(() => readStorage(LS_VIOLATIONS, 0))
  const [lockUntil, setLockUntil] = useState(() => readStorage(LS_LOCK_UNTIL, 0))
  const [now, setNow] = useState(() => Date.now())

  const identifierRef = useRef(null)
  const tickRef = useRef(null)

  const isLocked = lockUntil > now
  const secondsLeft = isLocked ? Math.ceil((lockUntil - now) / 1000) : 0

  // Countdown ticker while locked; also clears the lock once time is up.
  useEffect(() => {
    if (!isLocked) {
      clearInterval(tickRef.current)
      return
    }
    tickRef.current = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tickRef.current)
  }, [isLocked])

  useEffect(() => {
    identifierRef.current?.focus()
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

  function handleIdentifierChange(e) {
    const raw = e.target.value.slice(0, IDENTIFIER_MAX_LEN)
    setIdentifier(raw)
    const reason = checkSuspicious(raw)
    if (reason) {
      setFieldErrors((prev) => ({ ...prev, identifier: `That's not allowed here (${reason.toLowerCase()}).` }))
      registerViolation()
    } else {
      // Clear any previous error (suspicious or format) while the user is
      // actively editing — email-format is only re-checked on submit (see
      // handleSubmit), not on every keystroke or on blur, so nothing is
      // flagged until they actually click Sign in.
      setFieldErrors((prev) => ({ ...prev, identifier: '' }))
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

    const trimmedIdentifier = identifier.trim()
    const trimmedPassword = password.trim()

    const idSuspicious = checkSuspicious(trimmedIdentifier)
    const pwSuspicious = checkSuspicious(trimmedPassword)
    // Only worth checking format once we know it's not already flagged as
    // suspicious, so the two error types never fight over the same field.
    const idFormatReason = !idSuspicious ? checkIdentifierFormat(trimmedIdentifier) : null
    const pwFormatReason = !pwSuspicious ? checkPasswordFormat(trimmedPassword) : null

    const nextErrors = {
      identifier: !trimmedIdentifier
        ? 'Enter your email address.'
        : idSuspicious
          ? `That's not allowed here (${idSuspicious.toLowerCase()}).`
          : idFormatReason || '',
      password: !trimmedPassword
        ? 'Enter your password.'
        : pwSuspicious
          ? `That's not allowed here (${pwSuspicious.toLowerCase()}).`
          : pwFormatReason || '',
    }
    setFieldErrors(nextErrors)

    if (idSuspicious || pwSuspicious) {
      registerViolation()
      return
    }
    if (nextErrors.identifier || nextErrors.password) {
      setShake(true)
      window.setTimeout(() => setShake(false), 420)
      return
    }

    setFormError('')
    setSubmitting(true)
    try {
      // Values are always sent as explicit strings — never interpolated
      // into a query or rendered as HTML. Wire this up to your real
      // MongoDB-backed auth endpoint (e.g. POST /api/auth/login); the
      // backend must still perform its own type-checking and
      // sanitization regardless of what's already been checked here.
      if (onSubmit) {
        await onSubmit({ identifier: String(trimmedIdentifier), password: String(trimmedPassword), remember })
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 900))
        console.log('[Login] onSubmit not provided — simulated request only. Wire this to your auth API.')
      }
    } catch (err) {
      setFormError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const integrityState = isLocked ? 'locked' : (fieldErrors.identifier || fieldErrors.password) ? 'flagged' : 'clear'

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-tn-cream">
      <style>{`
        @keyframes loginShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .login-shake { animation: loginShake 0.42s ease-in-out; }
        }
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .login-fade-in { animation: loginFadeIn 0.5s ease-out; }
        }
      `}</style>

      {/* Identity header — mobile & tablet only. On lg the branding panel
          to the right takes over this job, so this is hidden there. */}
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
            Sign in to manage tenders, bids, and awards in one place.
          </p>
        </div>
        {/* Curved edge into the cream body — the same navy/cream boundary
            the desktop layout draws as a hard vertical line, reshaped for
            a stacked mobile layout. */}
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="block w-full h-5 text-tn-cream" aria-hidden="true">
          <path d="M0 24 Q200 0 400 24 Z" fill="currentColor" />
        </svg>
      </header>

      {/* Branding panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-tn-navy text-white flex-col justify-between p-10">
        {/* Faint procurement-ledger texture */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 34px, currentColor 34px, currentColor 35px)',
          }}
          aria-hidden="true"
        />

        {/* Signature mark — the one deliberate flourish on this panel */}
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
            Sign in to manage tenders, bids, and awards in one place.
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
              <IconDocument className="w-4.5 h-4.5 text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold">8,65,773</p>
                <p className="text-[11px] text-white/50">Tenders published since 2007</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <IconUsers className="w-4.5 h-4.5 text-white/40 mt-0.5 flex-shrink-0" />
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
        <div className={`w-full max-w-sm login-fade-in ${shake ? 'login-shake' : ''}`}>
          <h1 className="text-2xl font-display font-bold text-tn-navy">Sign in</h1>
          <p className="text-sm text-tn-muted mt-1 mb-7">Access your e-Procurement dashboard.</p>

          {isLocked ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col items-center text-center gap-2" role="alert">
              <IconLock className="w-7 h-7 text-red-500" />
              <p className="font-semibold text-red-700 text-sm">Sign-in temporarily locked</p>
              <p className="text-xs text-red-600/80 max-w-[22rem]">
                Repeated invalid input was detected. Try again in {secondsLeft}s, using only your normal email/username and password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="login-identifier" className="block text-xs font-semibold text-tn-navy mb-1.5">
                    Email address
                  </label>
                  <input
                    id="login-identifier"
                    ref={identifierRef}
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    disabled={submitting}
                    aria-invalid={!!fieldErrors.identifier}
                    aria-describedby={fieldErrors.identifier ? 'login-identifier-error' : undefined}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-tn-navy placeholder-tn-muted transition-colors focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue disabled:opacity-60 ${
                      fieldErrors.identifier ? 'border-red-300' : 'border-tn-border'
                    }`}
                    placeholder="you@department.tn.gov.in"
                  />
                  {fieldErrors.identifier && (
                    <p id="login-identifier-error" className="mt-1.5 text-xs text-red-600">{fieldErrors.identifier}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-xs font-semibold text-tn-navy">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => onForgotPassword?.()}
                      className="text-xs font-semibold text-tn-blue hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={handlePasswordChange}
                      onKeyUp={handlePasswordKeyUp}
                      disabled={submitting}
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                      className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border bg-white text-tn-navy placeholder-tn-muted transition-colors focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue disabled:opacity-60 ${
                        fieldErrors.password ? 'border-red-300' : 'border-tn-border'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tn-muted hover:text-tn-navy transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <IconEye open={showPassword} />
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="login-password-error" className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-tn-blue text-white hover:bg-tn-navy transition-colors disabled:opacity-60"
                >
                  {submitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-tn-border">
            <IntegrityStrip state={integrityState} secondsLeft={secondsLeft} />
          </div>
        </div>
      </div>

      {/* Trust footer — mobile & tablet only, mirrors the stats shown in
          the desktop branding panel so the page doesn't end on empty
          cream space. */}
      <footer className="lg:hidden border-t border-tn-border bg-white/60 px-6 sm:px-10 py-6">
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <div className="flex items-start gap-2.5">
            <IconDocument className="w-4.5 h-4.5 text-tn-navy/40 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-tn-navy">8,65,773</p>
              <p className="text-[11px] text-tn-muted">Tenders published since 2007</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <IconUsers className="w-4.5 h-4.5 text-tn-navy/40 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-tn-navy">52,860</p>
              <p className="text-[11px] text-tn-muted">Registered bidders</p>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-tn-muted/70 mt-4">A Government of Tamil Nadu digital initiative</p>
      </footer>
    </div>
  )
}