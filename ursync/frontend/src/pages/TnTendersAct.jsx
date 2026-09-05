import React from 'react'

export default function TnTendersAct() {
  return (
    <div className="p-4 lg:p-6 h-full">
      <div className="bg-white border border-tn-gold rounded-2xl overflow-hidden h-[calc(100vh-150px)] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFE5BF] bg-[#FFF2DB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-display font-bold text-tn-navy">
              Tamil Nadu Transparency in Tenders Act
            </h1>

            <p className="text-sm text-tn-muted mt-0.5">
              Official tender regulations and procedures.
            </p>
          </div>

          <nav className="text-xs text-tn-muted flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
            <span>Home</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-tn-blue font-medium">TN Tenders Act</span>
          </nav>
        </div>

        {/* Scrollable PDF Container */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <iframe
            src="/src/TN_Tenders_Act.pdf"
            title="TN Tenders Act"
            className="w-full h-full"
          />
        </div>

      </div>
    </div>
  )
}