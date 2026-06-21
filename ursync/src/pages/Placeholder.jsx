import React from 'react'
import { useLocation, Link } from 'react-router-dom'

export default function Placeholder() {
  const { pathname } = useLocation()
  const label = pathname.replace('/', '').replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-tn-light border border-tn-border flex items-center
                      justify-center mb-4">
        <svg className="w-6 h-6 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
        </svg>
      </div>
      <h2 className="text-lg font-display font-bold text-tn-navy mb-1">
        {label || 'Page'}
      </h2>
      <p className="text-tn-muted text-sm mb-6 text-center max-w-xs">
        This section is under development and will be available soon.
      </p>
      <Link to="/home" className="btn-secondary">
        ← Back to Home
      </Link>
    </div>
  )
}