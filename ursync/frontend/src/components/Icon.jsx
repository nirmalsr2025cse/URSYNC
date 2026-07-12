// src/components/Icon.jsx
// Shared icon set used across the Dashboard module (Dashboard.jsx,
// NumberWiseAnalysis.jsx, ValueWiseAnalysis.jsx). Keeping this in one place
// means every stat card / chart header icon stays visually consistent.
import React from 'react'

export default function Icon({ name, className }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }
  const paths = {
    doc:       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />,
    rupee:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 5h10M7 9h10M9 5c3 0 5 1.5 5 4s-2 4-5 4H7l8 6"/>,
    inbox:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12h4l2 3h4l2-3h4M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M4 12l2-7h12l2 7" />,
    building:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    users:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    usercheck: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 11a4 4 0 100-8 4 4 0 000 8zM2 21v-2a4 4 0 014-4h3.5M14.5 15.5l2.5 2.5 5-5" />,
    warning:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />,
    drill:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    menu:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />,
  }
  return <svg {...props}>{paths[name] || paths.doc}</svg>
}