// src/pages/TenderFinancialChangesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Search, FileText, Eye, CheckCircle,
  AlertTriangle, TrendingUp, TrendingDown, Calendar,
  Building2, MapPin, Tag, User,
  X, BarChart2, Clock, CheckCircle2, Pencil, Check,
} from "lucide-react";
import Pagination from "../components/Pagination";
import { useApi } from "../api/client";

const API_BASE = "/financial-changing";
const PAGE_SIZE = 9;

function fmt(n) {
  if (n == null || Number.isNaN(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN")}`;
}
function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function pctChange(original, revised) {
  if (!original) return 0;
  return (((revised - original) / original) * 100).toFixed(1);
}

function CostDiff({ original, revised }) {
  const diff = revised - original;
  const pct = pctChange(original, revised);
  if (diff === 0) return <span className="text-xs text-tn-muted font-medium">No change</span>;
  const up = diff > 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-bold ${up ? "text-tn-danger" : "text-tn-success"}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {up ? "+" : ""}{fmt(diff)} ({up ? "+" : ""}{pct}%)
    </div>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isApprove = toast.type === "approve";
  const isEdit = toast.type === "edit";
  const borderCls = isEdit ? "border-tn-blue" : isApprove ? "border-tn-success" : "border-tn-danger";
  const iconWrapCls = isEdit ? "bg-blue-100 text-tn-blue" : isApprove ? "bg-green-100 text-tn-success" : "bg-red-100 text-tn-danger";
  const title = isEdit ? "Amount Updated" : isApprove ? "Request Approved" : "Request Rejected";
  return (
    <div className="fixed top-5 right-5 z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div className={`flex items-start gap-3 rounded-xl shadow-xl border px-4 py-3 max-w-sm bg-white ${borderCls}`}>
        <div className={`p-1.5 rounded-full flex-shrink-0 ${iconWrapCls}`}>
          {isEdit ? <Pencil size={16} /> : isApprove ? <CheckCircle2 size={16} /> : <X size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-tn-navy">{title}</p>
          <p className="text-xs text-tn-muted mt-0.5 truncate">
            {toast.tenderCode} — {toast.projectName}{isEdit ? ` (New: ${fmt(toast.amount)})` : ""}
          </p>
        </div>
        <button onClick={onClose} className="text-tn-muted hover:text-tn-navy flex-shrink-0"><X size={14} /></button>
      </div>
    </div>
  );
}

// The changeType/"Cost Revision" badge from the old mock card is gone —
// there's nothing on the Tender/FinancialChange models that maps to it,
// so it's dropped rather than faked.
function FinancialCard({ tender, onView, onApprove, onReject }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newAmount, setNewAmount] = useState(tender.revisedCost);
  const [revisedNow, setRevisedNow] = useState(tender.revisedCost);
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setNewAmount(revisedNow);
    setIsEditing(true);
  }
  function cancelEdit() {
    setIsEditing(false);
    setNewAmount(revisedNow);
  }
  function saveEdit() {
    const val = parseFloat(newAmount);
    if (isNaN(val) || val < 0) return;
    // Local only — nothing is sent to the backend here. The value only
    // reaches the server if/when Approve is clicked afterwards.
    setRevisedNow(val);
    setIsEditing(false);
  }

  async function handleApproveClick() {
    setBusy(true);
    await onApprove(tender, revisedNow);
    setBusy(false);
  }
  async function handleRejectClick() {
    setBusy(true);
    await onReject(tender);
    setBusy(false);
  }

  return (
    <div className="h-full bg-white rounded-xl border border-tn-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-tn-muted">{tender.tenderCode}</p>
          <h3 className="text-sm font-bold text-tn-navy mt-0.5 leading-snug">{tender.projectName}</h3>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {isEditing ? (
          <div className="bg-tn-cream rounded-xl p-3 border border-tn-blue flex flex-col gap-2">
            <p className="text-xs font-semibold text-tn-navy">Enter New Revised Amount</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-tn-muted">₹</span>
              <input
                type="number"
                autoFocus
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-tn-border text-sm font-semibold text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/40"
                placeholder="Enter amount"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={saveEdit} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold bg-tn-success hover:bg-green-700 text-white transition-all">
                <Check size={13} /><span>Save</span>
              </button>
              <button onClick={cancelEdit} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold bg-tn-border hover:bg-slate-300 text-tn-navy transition-all">
                <X size={13} /><span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-tn-cream rounded-xl p-3 border border-tn-border flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-tn-muted font-medium">Original Cost</span>
              <span className="font-bold text-tn-navy">{fmt(tender.originalCost)}</span>
            </div>
            <div className="h-px bg-tn-border" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-tn-muted font-medium">Revised Cost</span>
              <span className={`font-bold ${revisedNow > tender.originalCost ? "text-tn-danger" : revisedNow < tender.originalCost ? "text-tn-success" : "text-tn-navy"}`}>
                {fmt(revisedNow)}
              </span>
            </div>
            <div className="h-px bg-tn-border" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-tn-muted font-medium">Net Change</span>
              <CostDiff original={tender.originalCost} revised={revisedNow} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-tn-muted">
          <div className="flex items-center gap-1.5"><Building2 size={11} className="flex-shrink-0" /><span className="truncate">{tender.organization}</span></div>
          <div className="flex items-center gap-1.5"><MapPin size={11} className="flex-shrink-0" /><span>{tender.district}</span></div>
          <div className="flex items-center gap-1.5"><Tag size={11} className="flex-shrink-0" /><span>{tender.category}</span></div>
          <div className="flex items-center gap-1.5"><Calendar size={11} className="flex-shrink-0" /><span>{fmtDate(tender.requestedDate)}</span></div>
          <div className="col-span-2 flex items-center gap-1.5"><User size={11} className="flex-shrink-0" /><span className="truncate">{tender.requestedBy}</span></div>
        </div>

        <div className="bg-tn-light rounded-lg px-3 py-2 text-xs text-tn-navy border border-tn-border">
          <span className="text-tn-muted font-semibold">Reason: </span>{tender.reason || "—"}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-tn-border mt-auto">
        <button onClick={() => onView(tender)} disabled={busy} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-blue hover:bg-tn-navy text-white transition-all disabled:opacity-50">
          <Eye size={12} /><span>View</span>
        </button>
        <button onClick={startEdit} disabled={busy} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-indigo-500 hover:bg-indigo-700 text-white transition-all disabled:opacity-50">
          <Pencil size={12} /><span>Edit</span>
        </button>
        <button onClick={handleApproveClick} disabled={busy} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-success hover:bg-green-700 text-white transition-all disabled:opacity-50">
          <CheckCircle size={12} /><span>Approve</span>
        </button>
        <button onClick={handleRejectClick} disabled={busy} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-danger hover:bg-red-700 text-white transition-all disabled:opacity-50">
          <X size={12} /><span>Reject</span>
        </button>
      </div>
    </div>
  );
}

export default function TenderFinancialChangesPage() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const json = await apiFetch(API_BASE);
      if (!json.success) throw new Error(json.message || "Failed to load");
      setAll(json.data);
    } catch (err) {
      setErrorMsg(err.message || "Failed to load financial change requests");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const q = keyword.trim().toLowerCase();
  const filtered = q
    ? all.filter((t) => [t.tenderCode, t.projectName, t.organization, t.district].some((f) => (f || "").toLowerCase().includes(q)))
    : all;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleReset = () => { setKeyword(""); setPage(1); };

  function handleView(tender) {
    navigate("/financial-changes/details", { state: { tender, mode: "view" } });
  }
  async function handleApprove(tender, revisedAmount) {
    try {
      const json = await apiFetch(`${API_BASE}/${encodeURIComponent(tender.tenderCode)}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ revisedAmount }),
      });
      if (!json.success) throw new Error(json.message || "Approve failed");
      setAll((prev) => prev.filter((t) => t.tenderCode !== tender.tenderCode));
      setToast({ type: "approve", tenderCode: tender.tenderCode, projectName: tender.projectName });
    } catch (err) {
      setToast({ type: "reject", tenderCode: tender.tenderCode, projectName: `Approve failed: ${err.message}` });
    }
  }

  async function handleReject(tender) {
    try {
      const json = await apiFetch(`${API_BASE}/${encodeURIComponent(tender.tenderCode)}/reject`, {
        method: "PATCH",
      });
      if (!json.success) throw new Error(json.message || "Reject failed");
      setAll((prev) => prev.filter((t) => t.tenderCode !== tender.tenderCode));
      setToast({ type: "reject", tenderCode: tender.tenderCode, projectName: tender.projectName });
    } catch (err) {
      setToast({ type: "reject", tenderCode: tender.tenderCode, projectName: `Reject failed: ${err.message}` });
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Page Header + Breadcrumb ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">Tender Financial Changes</h1>
          <p className="text-sm text-tn-muted mt-0.5">Review and approve all financial revision requests submitted for active tenders.</p>
        </div>

        <nav className="text-xs text-tn-muted flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
          <span>Home</span>
          <ChevronRight size={12} />
          <span className="text-tn-blue font-medium">Tender Financial Changes</span>
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-tn-border shadow-sm p-5 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-tn-muted" />
            <input type="text" value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              placeholder="Search by Tender ID, Project Name, Department or District"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-tn-border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40"
            />
          </div>
          {keyword.trim() && (
            <button type="button" onClick={handleReset} className="text-xs text-tn-muted underline whitespace-nowrap self-center sm:self-auto">Clear all</button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={18} className="text-tn-muted" />
        <h2 className="text-base font-bold text-tn-navy">Financial Change Requests</h2>
        <span className="bg-tn-gold text-tn-navy text-xs font-bold px-3 py-1 rounded-full">Showing {filtered.length}</span>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-tn-border p-12 text-center">
          <Clock size={36} className="text-tn-muted mx-auto mb-3 animate-spin" />
          <p className="text-tn-muted text-sm">Loading financial change requests…</p>
        </div>
      )}

      {!loading && errorMsg && (
        <div className="bg-white rounded-xl border border-tn-border p-12 text-center">
          <AlertTriangle size={36} className="text-tn-danger mx-auto mb-3" />
          <p className="text-tn-danger text-sm">{errorMsg}</p>
        </div>
      )}

      {!loading && !errorMsg && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-tn-border p-12 text-center">
          <BarChart2 size={36} className="text-tn-muted mx-auto mb-3" />
          <p className="text-tn-muted text-sm">No financial change requests found.</p>
        </div>
      )}

      {!loading && !errorMsg && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paged.map((t) => (
              <FinancialCard
                key={t.tenderCode}
                tender={t}
                onView={handleView}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}