import React from "react";
import { X, MapPin, Landmark, Users, Tag, Boxes, CalendarClock, IndianRupee, FileText, Download } from "lucide-react";
import StatusBadge, { getStatusConfig } from "./StatusBadge.jsx";
import { formatIndianCurrency, formatDate } from "../utils/format.js";

export default function TenderDetailsModal({ tender, onClose }) {
  if (!tender) return null;

  const statusCfg = getStatusConfig(tender.status);

  const rows = [
    { icon: Landmark, label: "Organization", value: tender.organizationName },
    { icon: Users, label: "Department", value: tender.department },
    { icon: MapPin, label: "District", value: tender.district },
    { icon: Tag, label: "Tender Category", value: tender.tenderCategory },
    { icon: Boxes, label: "Product Category", value: tender.productCategory },
    { icon: CalendarClock, label: "Closing Date", value: formatDate(tender.closingDate) },
    { icon: IndianRupee, label: "Budget Amount", value: formatIndianCurrency(tender.amount) },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status accent bar */}
        <div className={`h-1.5 w-full rounded-t-2xl ${statusCfg.bar}`} />

        {/* Banner */}
        <div className="relative h-44 w-full bg-rust-50 overflow-hidden">
          {tender.image ? (
            <img src={tender.image} alt={tender.projectName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-rust-400">
              <Landmark size={42} />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-rust-700 rounded-full p-1.5 shadow"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-2">
            <StatusBadge status={tender.status} />
          </div>

          <p className="text-xs font-mono text-rust-500">{tender.tenderId}</p>
          <h2 className="text-lg font-bold text-rust-900 mt-1">{tender.projectName}</h2>

          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2 bg-cream-50 rounded-lg p-3">
                <Icon size={16} className="text-rust-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-rust-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-rust-900">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <a
              href={tender.document || "#"}
              download
              onClick={(e) => !tender.document && e.preventDefault()}
              className="flex items-center justify-center gap-2 flex-1 bg-rust-500 hover:bg-rust-600 text-white font-semibold text-sm py-2.5 rounded-md transition-colors"
            >
              <Download size={16} />
              Download Document
            </a>
            <button
              onClick={onClose}
              className="flex-1 border border-rust-200 text-rust-700 font-semibold text-sm py-2.5 rounded-md hover:bg-cream-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
