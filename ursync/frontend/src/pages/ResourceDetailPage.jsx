// src/pages/ResourceDetailPage.jsx
import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Tag, MapPin, Building2, Package, DollarSign,
  CheckCircle, FileText, ArrowLeft,
} from 'lucide-react'
import RESOURCES from '../data/resourceData.js'

export default function ResourceDetailPage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const resource   = state?.resource || RESOURCES[0]
  const district = resource.district?.name || resource.district?.code || resource.district || 'Not specified'
  const department = resource.departmentId?.name || resource.departmentId?.code || resource.owner || 'Not specified'
  const available = resource.available ?? resource.quantity ?? 0

  // Always open at the very top of the page
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const infoRows = [
    { icon: Tag,        label: 'Category',        value: resource.category },
    { icon: MapPin,     label: 'District',         value: district },
    { icon: Building2,  label: 'Owner Department', value: department },
    { icon: Package,    label: 'Specifications',   value: resource.description || 'Not specified' },
    { icon: DollarSign, label: 'Daily Rate',       value: 'Not specified' },
    { icon: Package,    label: 'Units Available',  value: `${available} unit${available !== 1 ? 's' : ''}` },
  ]

  const goBack = () => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    navigate(-1)
  }

  const goTo = (path, opts) => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    navigate(path, opts)
  }

  return (
    <div className="min-h-screen bg-tn-cream animate-fade-in">

      {/* ── Back header — exactly like screenshot: chevron + title + id ── */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-tn-navy active:opacity-60 transition-opacity"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="mt-1 pl-1">
          <h1 className="text-lg font-extrabold text-tn-navy leading-tight">{resource.name}</h1>
          <p className="text-xs text-tn-muted mt-0.5">{resource._id || resource.id}</p>
        </div>
      </div>

      {/* ── Full-width banner image ── */}
      <div className="relative w-full h-56 sm:h-72 md:h-80 overflow-hidden bg-tn-light">
        <img
          src={resource.image}
          alt={resource.name}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Available badge — top right */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle size={13} />
          Available
        </div>

        {/* Name overlay — bottom left */}
        <div className="absolute bottom-5 left-4 sm:left-8">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
            {resource.category}
          </p>
          <h1 className="text-white text-2xl sm:text-3xl font-extrabold leading-tight drop-shadow">
            {resource.name}
          </h1>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="px-4 sm:px-8 py-6 mx-auto space-y-6">

        {/* About */}
        <div>
          <h2 className="text-[11px] font-bold text-tn-muted uppercase tracking-widest mb-2">
            About this Resource
          </h2>
          <p className="text-sm text-tn-navy leading-relaxed">{resource.description}</p>
        </div>

        {/* Resource Details grid */}
        <div>
          <h2 className="text-[11px] font-bold text-tn-muted uppercase tracking-widest mb-3">
            Resource Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-3 bg-white rounded-xl p-4 border border-tn-border shadow-sm"
              >
                <div className="bg-tn-cream rounded-lg p-2 border border-tn-border flex-shrink-0">
                  <Icon size={15} className="text-tn-blue" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-tn-muted uppercase tracking-widest">
                    {label}
                  </p>
                  <p className="text-sm font-bold text-tn-navy mt-0.5 break-words">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="bg-tn-amber border border-tn-gold rounded-xl p-4">
          <h2 className="text-sm font-bold text-tn-navy mb-2 flex items-center gap-2">
            <FileText size={15} className="text-tn-warn flex-shrink-0" /> Terms of Use
          </h2>
          <ul className="text-xs text-tn-navy space-y-1.5 list-disc list-inside">
            <li>Resource is available for government department use only.</li>
            <li>Minimum booking period is 1 day. Maximum is 30 days per request.</li>
            <li>The requesting department is responsible for safe operation.</li>
            <li>Any damage must be reported immediately to the owner department.</li>
            <li>Fuel and operator charges are included in the daily rate.</li>
          </ul>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            onClick={() => goTo('/search-resource/get-resource', { state: { resource } })}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-tn-blue hover:bg-tn-navy text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} /> GET RESOURCE
          </button>
          <button
            onClick={goBack}
            className="flex-1 py-3.5 rounded-xl border border-tn-border text-tn-navy text-sm font-semibold hover:bg-tn-light transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <ArrowLeft size={15} /> Go Back
          </button>
        </div>
      </div>
    </div>
  )
}