// src/pages/TenderFinancialChangeDetailsPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronRight, ChevronLeft, ArrowUpDown, FileText, Download,
  Info, MessageSquare,
} from "lucide-react";
import {
  fmt, fmtDate, pctChange, getStatus, getPriority, getChange,
} from "../data/tenderFinancialData";

// ─── Badges (kept local so this page has no dependency on the list page) ─────
function StatusBadge({ status }) {
  const c = getStatus(status);
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{status}</span>;
}
function PriorityBadge({ priority }) {
  const c = getPriority(priority);
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{priority}</span>;
}
function ChangeBadge({ changeType }) {
  const c = getChange(changeType);
  const Icon = c.icon;
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.cls}`}><Icon size={11}/>{changeType}</span>;
}

export default function TenderFinancialChangeDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tender, mode = "view" } = location.state || {};

  const [remarks, setRemarks] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!tender) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-tn-muted mb-4">No tender selected. Please go back and choose a request to view.</p>
        <button
          onClick={() => navigate("/financial-changes")}
          className="inline-flex items-center gap-2 bg-tn-blue hover:bg-tn-navy text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          <ChevronLeft size={15}/>Back to Financial Changes
        </button>
      </div>
    );
  }

  const diff = tender.revisedCost - tender.originalCost;
  const isQuery = mode === "query";

  function handleSubmit() {
    if (!remarks.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      navigate("/financial-changes");
    }, 900);
  }

  return (
    <div className="p-4 sm:p-6 w-full">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-tn-muted mb-3">
        <span>Home</span><ChevronRight size={12}/>
        <span>Financial Department</span><ChevronRight size={12}/>
        <button onClick={() => navigate("/financial-changes")} className="hover:text-tn-navy hover:underline">Tender Financial Changes</button>
        <ChevronRight size={12}/>
        <span className="text-tn-blue font-semibold">Details</span>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate("/financial-changes")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-tn-blue hover:text-tn-navy mb-4 transition-colors"
      >
        <ChevronLeft size={16}/>Back
      </button>

      <div className="bg-white rounded-xl border border-tn-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-tn-navy text-white px-6 py-4">
          <p className="text-xs text-blue-200 font-mono">{tender.tenderId}</p>
          <h1 className="text-lg font-bold mt-0.5 leading-tight">{tender.projectName}</h1>
          <p className="text-xs text-blue-300 mt-0.5">Financial Change Request {isQuery ? "— Raise a Query" : "— Details"}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={tender.priority}/>
            <StatusBadge status={tender.status}/>
            <ChangeBadge changeType={tender.changeType}/>
          </div>

          {/* Financial Summary */}
          <div>
            <h3 className="text-xs font-bold text-tn-muted uppercase tracking-wider mb-3">Financial Summary</h3>
            <div className="bg-tn-navy rounded-xl p-5 text-white">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-blue-300">Original Cost</p>
                  <p className="text-lg font-bold mt-1">{fmt(tender.originalCost)}</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <ArrowUpDown size={20} className="text-blue-300"/>
                  <p className={`text-sm font-bold mt-1 ${diff > 0 ? "text-tn-warn" : diff < 0 ? "text-green-400" : "text-blue-300"}`}>
                    {diff > 0 ? "+" : ""}{fmt(diff)}<br/>
                    <span className="text-xs font-normal">({diff > 0 ? "+" : ""}{pctChange(tender.originalCost, tender.revisedCost)}%)</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-300">Revised Cost</p>
                  <p className={`text-lg font-bold mt-1 ${diff > 0 ? "text-tn-warn" : diff < 0 ? "text-green-400" : ""}`}>{fmt(tender.revisedCost)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tender Info */}
          <div>
            <h3 className="text-xs font-bold text-tn-muted uppercase tracking-wider mb-3">Tender Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[["Tender ID",tender.tenderId],["Organization",tender.organization],["Department",tender.department],["District",tender.district],["Category",tender.category],["Requested By",tender.requestedBy],["Request Date",fmtDate(tender.requestedDate)]].map(([l,v])=>(
                <div key={l} className="bg-tn-cream rounded-lg p-3 border border-tn-border">
                  <p className="text-[11px] text-tn-muted uppercase tracking-wide">{l}</p>
                  <p className="text-sm font-semibold text-tn-navy mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-xs font-bold text-tn-muted uppercase tracking-wider mb-3">Reason for Change</h3>
            <div className="bg-tn-light rounded-xl p-4 border border-tn-border flex items-start gap-3">
              <Info size={16} className="text-tn-blue flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-tn-navy">{tender.changeReason}</p>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-xs font-bold text-tn-muted uppercase tracking-wider mb-3">Supporting Documents</h3>
            <div className="flex flex-col gap-2">
              {tender.documents.map(doc=>(
                <div key={doc} className="flex items-center justify-between bg-tn-cream rounded-lg px-4 py-2.5 border border-tn-border">
                  <div className="flex items-center gap-2 text-sm text-tn-navy font-medium">
                    <FileText size={14} className="text-tn-muted"/>{doc}
                  </div>
                  <button className="text-xs flex items-center gap-1 text-tn-blue hover:text-tn-navy font-semibold transition-colors">
                    <Download size={13}/>View
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Query-only: Financial Remarks + Submit */}
          {isQuery && (
            <div>
              <h3 className="text-xs font-bold text-tn-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare size={13}/>Financial Remarks
              </h3>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={4}
                placeholder="Enter your query, remarks or conditions for this financial change request..."
                className="w-full text-sm border border-tn-border rounded-xl px-4 py-3 text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40 resize-none"
              />

              {submitted ? (
                <div className="mt-4 bg-green-50 border border-tn-success text-tn-success text-sm font-semibold rounded-lg px-4 py-3 text-center">
                  Query submitted successfully.
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!remarks.trim()}
                  className={[
                    "mt-4 w-full flex items-center justify-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-lg transition-all",
                    remarks.trim()
                      ? "bg-tn-blue hover:bg-tn-navy text-white cursor-pointer"
                      : "bg-tn-blue/40 text-white/70 cursor-not-allowed opacity-50",
                  ].join(" ")}
                >
                  Submit
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}