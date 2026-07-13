//RESOURSE DETAIL PAGE


import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, MapPin, Tag, Building2, CheckCircle, XCircle,
  DollarSign, Package, ArrowLeft, FileText, AlertCircle,
} from "lucide-react";
import RESOURCES from "../data/resourceData.js";

export default function ResourceDetailPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const resource  = state?.resource || RESOURCES[0];

  const infoRows = [
    { icon: Tag,       label: "Category",         value: resource.category },
    { icon: MapPin,    label: "District",          value: resource.district },
    { icon: Building2, label: "Owner Department",  value: resource.owner },
    { icon: Package,   label: "Specifications",    value: resource.specs },
    { icon: DollarSign,label: "Daily Rate",        value: `₹${resource.dailyRate.toLocaleString("en-IN")} per day` },
    { icon: Package,   label: "Units Available",   value: resource.available ? `${resource.quantity} unit${resource.quantity > 1 ? "s" : ""}` : "Currently unavailable" },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-[1000px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-tn-muted mb-4 flex-wrap">
        <span>Home</span><ChevronRight size={12}/>
        <button onClick={() => navigate("/search-resource")} className="hover:text-tn-blue transition-colors">Search Resource</button>
        <ChevronRight size={12}/>
        <span className="text-tn-blue font-semibold">{resource.name}</span>
      </div>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-tn-muted hover:text-tn-navy font-medium mb-6 transition-colors">
        <ArrowLeft size={16}/> Back to Results
      </button>

      <div className="bg-white rounded-2xl border border-tn-border shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="relative h-64 w-full overflow-hidden bg-tn-light">
          <img src={resource.image} alt={resource.name} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/>
          <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg
            ${resource.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {resource.available ? <CheckCircle size={13}/> : <XCircle size={13}/>}
            {resource.available ? "Available" : "Not Available"}
          </div>
          <div className="absolute bottom-4 left-5">
            <p className="text-white/70 text-xs font-medium mb-1">{resource.category}</p>
            <h1 className="text-white text-2xl font-extrabold">{resource.name}</h1>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-tn-muted uppercase tracking-wider mb-2">About this Resource</h2>
            <p className="text-sm text-tn-navy leading-relaxed">{resource.description}</p>
          </div>

          {/* Info grid */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-tn-muted uppercase tracking-wider mb-3">Resource Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {infoRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 bg-tn-cream rounded-xl p-4 border border-tn-border">
                  <div className="bg-white rounded-lg p-2 border border-tn-border flex-shrink-0">
                    <Icon size={15} className="text-tn-blue"/>
                  </div>
                  <div>
                    <p className="text-[11px] text-tn-muted uppercase tracking-wide font-semibold">{label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${label === "Units Available" && !resource.available ? "text-red-600" : "text-tn-navy"}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms */}
          <div className="bg-tn-amber border border-tn-gold rounded-xl p-4 mb-6">
            <h2 className="text-sm font-bold text-tn-navy mb-2 flex items-center gap-2">
              <FileText size={15} className="text-tn-warn"/> Terms of Use
            </h2>
            <ul className="text-xs text-tn-navy space-y-1 list-disc list-inside">
              <li>Resource is available for government department use only.</li>
              <li>Minimum booking period is 1 day. Maximum is 30 days per request.</li>
              <li>The requesting department is responsible for safe operation.</li>
              <li>Any damage must be reported immediately to the owner department.</li>
              <li>Fuel and operator charges are included in the daily rate.</li>
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/search-resource/get-resource", { state: { resource } })}
              disabled={!resource.available}
              className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
                ${resource.available
                  ? "bg-tn-blue hover:bg-tn-navy text-white shadow-md hover:shadow-lg active:scale-[0.98]"
                  : "bg-tn-blue text-white cursor-not-allowed opacity-30 blur-[1px] pointer-events-none select-none"
                }`}
            >
              <CheckCircle size={16}/> GET RESOURCE
              {!resource.available && <span className="text-xs font-normal ml-1">(Not Available)</span>}
            </button>
            <button onClick={() => navigate(-1)}
              className="flex-1 py-3.5 rounded-xl border border-tn-border text-tn-navy text-sm font-semibold hover:bg-tn-light transition-colors flex items-center justify-center gap-2">
              <ArrowLeft size={15}/> Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}