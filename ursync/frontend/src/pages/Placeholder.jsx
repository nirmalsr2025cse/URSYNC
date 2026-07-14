import React from 'react'
import { useLocation, Link } from 'react-router-dom'

export default function Placeholder() {
  const { pathname } = useLocation()
  const label = pathname.replace('/', '').replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <h1>404: Page Not Found</h1>
      <Link to="/home" className="btn-secondary">
        ← Back to Home
      </Link>
    </div>
  )
}