import React from "react";
import { Eye, Download } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";
import { formatIndianCurrency, formatDate } from "../utils/format.js";

export default function TenderTable({ tenders, onViewDetails }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-rust-100 overflow-x-auto">
      <table className="w-full text-sm min-w-[1100px]">
        <thead>
          <tr className="bg-rust-600 text-white text-left text-xs uppercase tracking-wide">
            <th className="px-4 py-3 font-semibold">Tender ID</th>
            <th className="px-4 py-3 font-semibold">Project Name</th>
            <th className="px-4 py-3 font-semibold">Organization</th>
            <th className="px-4 py-3 font-semibold">Department</th>
            <th className="px-4 py-3 font-semibold">District</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Product Category</th>
            <th className="px-4 py-3 font-semibold">Closing Date</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenders.map((tender, idx) => (
            <tr
              key={tender._id || tender.tenderId}
              className={`border-b border-rust-50 hover:bg-cream-50 transition-colors ${
                idx % 2 === 0 ? "bg-white" : "bg-cream-50/40"
              }`}
            >
              <td className="px-4 py-3 font-mono text-rust-600 whitespace-nowrap">
                {tender.tenderId}
              </td>
              <td className="px-4 py-3 max-w-[260px]">
                <span className="line-clamp-2 text-rust-900 font-medium">{tender.projectName}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-rust-800">{tender.organizationName}</td>
              <td className="px-4 py-3 max-w-[180px]">
                <span className="line-clamp-2 text-rust-700">{tender.department}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-rust-700">{tender.district}</td>
              <td className="px-4 py-3 whitespace-nowrap text-rust-700">{tender.tenderCategory}</td>
              <td className="px-4 py-3 whitespace-nowrap text-rust-700">{tender.productCategory}</td>
              <td className="px-4 py-3 whitespace-nowrap text-rust-700">{formatDate(tender.closingDate)}</td>
              <td className="px-4 py-3 whitespace-nowrap font-bold text-rust-900">
                {formatIndianCurrency(tender.amount)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={tender.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onViewDetails(tender)}
                    className="p-1.5 rounded-md text-rust-600 hover:bg-cream-100 transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  <a
                    href={tender.document || "#"}
                    download
                    onClick={(e) => !tender.document && e.preventDefault()}
                    className="p-1.5 rounded-md text-rust-600 hover:bg-cream-100 transition-colors"
                    title="Download Document"
                  >
                    <Download size={16} />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
