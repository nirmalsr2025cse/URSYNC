import React from 'react'

export default function TnTendersAct() {
  return (
    <div className="p-4 lg:p-6 h-full">
      <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden h-[calc(100vh-150px)] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFE5BF] bg-[#FFF2DB]">
          <h1 className="text-xl font-bold text-[#0A2240]">
            Tamil Nadu Transparency in Tenders Act
          </h1>

          <p className="text-sm text-[#6B7A8D] mt-1">
            Official tender regulations and procedures.
          </p>
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