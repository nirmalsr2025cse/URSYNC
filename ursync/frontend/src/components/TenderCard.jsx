import React from "react";
import { Landmark, Users, MapPin, CalendarDays, Download } from "lucide-react";
import StatusBadge, { getStatusConfig } from "./StatusBadge.jsx";
import { formatIndianCurrency, formatDate } from "../utils/format.js";

export default function TenderCard({ tender, onViewDetails }) {
  const {
    tenderId,
    projectName,
    organizationName,
    department,
    district,
    closingDate,
    amount,
    status,
    image,
  } = tender;

  const statusCfg = getStatusConfig(status);

  return (
    <div
      onClick={() => onViewDetails(tender)}
      className="bg-white rounded-2xl shadow-card border border-rust-100 overflow-hidden hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
    >
      {/* Top status-colored accent bar */}
      <div className={`h-1.5 w-full ${statusCfg.bar}`} />

      {/* Banner image */}
      <div className="relative h-40 w-full overflow-hidden bg-rust-50">
        {image ? (
          <img
            src={image}
            alt={projectName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-rust-400">
            <Landmark size={36} />
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-2">
          <StatusBadge status={status} />
        </div>

        <p className="text-xs font-mono text-rust-500 tracking-wide">{tenderId}</p>
        <h3 className="text-base font-bold text-rust-900 mt-1 mb-3 leading-snug">
          {projectName}
        </h3>

        <div className="space-y-2 text-sm text-rust-700 pb-3 border-b border-rust-100">
          <div className="flex items-center gap-2">
            <Landmark size={15} className="text-rust-400 flex-shrink-0" />
            <span className="font-medium">{organizationName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={15} className="text-rust-400 flex-shrink-0" />
            <span>{department}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-rust-400 flex-shrink-0" />
            <span>{district}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-rust-400 flex-shrink-0" />
            <span>Closes: {formatDate(closingDate)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex-1 bg-cream-100 text-rust-900 font-bold text-sm text-center py-2.5 rounded-lg">
            {formatIndianCurrency(amount)}
          </div>
          <a
            href={tender.document || "#"}
            download
            onClick={(e) => {
              e.stopPropagation();
              if (!tender.document) e.preventDefault();
            }}
            className="flex items-center justify-center bg-cream-100 hover:bg-cream-200 text-rust-600 p-2.5 rounded-lg transition-colors flex-shrink-0"
            title="Download Document"
          >
            <Download size={17} />
          </a>
        </div>
      </div>
    </div>
  );
}
