import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen bg-[#FFF2DB] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background Decorative Rings */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#FFE5BF] rounded-full pointer-events-none blur-3xl opacity-60" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#FFE5BF] rounded-full pointer-events-none blur-3xl opacity-60" />

      {/* Main 404 Container */}
      <div className="relative z-10 max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border-2 border-[#FFE5BF] text-center animate-fade-in">
        {/* Government Portal Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#FFE5BF] flex items-center justify-center font-display font-bold text-[#0A2240] text-xs select-none border border-[#FFE5BF]">
            TN
          </div>
          <span className="text-xs font-bold text-[#0A2240] uppercase tracking-wider">
            Tamil Nadu e-Procurement Portal
          </span>
        </div>

        {/* 404 Numeric Hero */}
        <div className="relative inline-block mb-3">
          <h1 className="text-7xl sm:text-8xl font-black text-[#0A2240] tracking-tight font-display select-none">
            404
          </h1>
          <div className="absolute -bottom-1 -right-2 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold uppercase tracking-wider border border-red-200">
            Error
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A2240] mb-2">
          Page Not Found
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-8 max-w-sm mx-auto">
          The requested URL does not exist or is unavailable. Please check the URL or return to the home portal.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-[#0A2240] bg-[#FFF2DB] hover:bg-[#FFE5BF] rounded-xl transition-all border border-[#FFE5BF]"
          >
            ← Go Back
          </button>
          <Link
            to="/home"
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-[#0A2240] hover:bg-[#1A4A8C] rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            Back to Home Portal
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 text-[11px] text-gray-500 mt-6 text-center font-medium">
        © {new Date().getFullYear()} Government of Tamil Nadu. All rights reserved.
      </p>
    </div>
  )
}
