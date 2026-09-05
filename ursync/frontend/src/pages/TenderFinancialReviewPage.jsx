// src/pages/TenderFinancialReviewPage.jsx
//
// Wired to the real backend:
//   GET   /api/financial-changes/apply    -> Apply tab   (financialField=false)
//   GET   /api/financial-changes/applied  -> Applied tab (financialField=true)
//   PATCH /api/financial-changes/:tenderId -> save a new amount + reason
//
// Access: department_head (scoped to their own department) / administrator.
// Everything else (layout, cards, search, pagination, tab bar) is unchanged
// from the mock version — only the data-loading and save logic changed.

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ChevronRight, Search, FileText, Eye, TrendingUp, TrendingDown,
  Calendar, Building2, MapPin, Tag, User, X,
  BarChart2, CheckCircle2, Pencil, Check, AlertTriangle, Loader2,
} from "lucide-react";
import { useApi } from "../api/client";

const PAGE_SIZE = 6;

function fmt(n) {
  if (n == null) return "-";
  return `\u20B9${Number(n).toLocaleString("en-IN")}`;
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}
function pctChange(original, revised) {
  if (!original) return 0;
  return (((revised - original) / original) * 100).toFixed(1);
}

// ─── Badges ─────────────────────────────────────────────────────────────
function getStatusBadgeCls(status) {
  if (status === "Applied") return { cls: "bg-green-50 text-tn-success", dot: "bg-tn-success" };
  return { cls: "bg-orange-50 text-tn-warn", dot: "bg-tn-warn" };
}
function StatusBadge({ status }) {
  const c = getStatusBadgeCls(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{status}
    </span>
  );
}

function CostDiff({ original, revised }) {
  const diff = revised - original;
  const pct  = pctChange(original, revised);
  if (diff === 0) return <span className="text-xs text-tn-muted font-medium">No change</span>;
  const up = diff > 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-bold ${up ? "text-tn-danger" : "text-tn-success"}`}>
      {up ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
      {up ? "+" : ""}{fmt(diff)} ({up ? "+" : ""}{pct}%)
    </div>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isEdit  = toast.type === "edit";
  const isError = toast.type === "error";
  const borderCls   = isError ? "border-tn-danger" : isEdit ? "border-tn-blue" : "border-tn-success";
  const iconWrapCls = isError ? "bg-red-100 text-tn-danger" : isEdit ? "bg-blue-100 text-tn-blue" : "bg-green-100 text-tn-success";
  const title = isError ? "Something went wrong" : isEdit ? "Amount Updated" : "Done";
  return (
    <div className="fixed top-5 right-5 z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div className={`flex items-start gap-3 rounded-xl shadow-xl border px-4 py-3 max-w-sm bg-white ${borderCls}`}>
        <div className={`p-1.5 rounded-full flex-shrink-0 ${iconWrapCls}`}>
          {isError ? <AlertTriangle size={16}/> : isEdit ? <Pencil size={16}/> : <CheckCircle2 size={16}/>}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-tn-navy">{title}</p>
          <p className="text-xs text-tn-muted mt-0.5 truncate">
            {toast.tenderId} — {toast.projectName}{isEdit && toast.amount != null ? ` (New: ${fmt(toast.amount)})` : ""}
          </p>
        </div>
        <button onClick={onClose} className="text-tn-muted hover:text-tn-navy flex-shrink-0"><X size={14}/></button>
      </div>
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────
// `editable` -> true on Apply tab (View + Edit), false on Applied tab (View only)
function FinancialCard({ row, editable, saving, onView, onEditSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newAmount, setNewAmount] = useState(row.revisedCost);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);

  function startEdit() {
    setNewAmount(row.revisedCost);
    setReason("");
    setReasonTouched(false);
    setIsEditing(true);
  }
  function cancelEdit() {
    setIsEditing(false);
    setNewAmount(row.revisedCost);
    setReason("");
    setReasonTouched(false);
  }
  async function saveEdit() {
    const val = parseFloat(newAmount);
    const trimmedReason = reason.trim();
    setReasonTouched(true);
    if (isNaN(val) || val < 0 || !trimmedReason) return;
    setIsEditing(false);
    await onEditSave(row, val, trimmedReason);
  }

  return (
    <div className="h-full bg-white rounded-xl border border-tn-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-tn-muted">{row.tenderCode}</p>
          <h3 className="text-sm font-bold text-tn-navy mt-0.5 leading-snug">{row.projectName}</h3>
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
                onChange={e => setNewAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-tn-border text-sm font-semibold text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/40"
                placeholder="Enter amount"
              />
            </div>

            <p className="text-xs font-semibold text-tn-navy mt-1">Reason for Change</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border text-xs text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/40 ${
                reasonTouched && !reason.trim() ? "border-tn-danger" : "border-tn-border"
              }`}
              placeholder="Why is this amount being revised?"
            />
            {reasonTouched && !reason.trim() && (
              <p className="text-[11px] text-tn-danger -mt-1">Reason is required.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button disabled={saving} onClick={saveEdit} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold bg-tn-success hover:bg-green-700 text-white transition-all disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}<span>Save</span>
              </button>
              <button disabled={saving} onClick={cancelEdit} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold bg-tn-border hover:bg-slate-300 text-tn-navy transition-all disabled:opacity-60">
                <X size={13}/><span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-tn-cream rounded-xl p-3 border border-tn-border flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-tn-muted font-medium">Original Cost</span>
              <span className="font-bold text-tn-navy">{fmt(row.originalCost)}</span>
            </div>
            <div className="h-px bg-tn-border"/>
            <div className="flex items-center justify-between text-xs">
              <span className="text-tn-muted font-medium">Revised Cost</span>
              <span className={`font-bold ${row.revisedCost > row.originalCost ? "text-tn-danger" : row.revisedCost < row.originalCost ? "text-tn-success" : "text-tn-navy"}`}>
                {fmt(row.revisedCost)}
              </span>
            </div>
            <div className="h-px bg-tn-border"/>
            <div className="flex items-center justify-between">
              <span className="text-xs text-tn-muted font-medium">Net Change</span>
              <CostDiff original={row.originalCost} revised={row.revisedCost}/>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-tn-muted">
          <div className="flex items-center gap-1.5"><Building2 size={11} className="flex-shrink-0"/><span className="truncate">{row.department}</span></div>
          <div className="flex items-center gap-1.5"><MapPin size={11} className="flex-shrink-0"/><span>{row.district}</span></div>
          <div className="flex items-center gap-1.5"><Tag size={11} className="flex-shrink-0"/><span>{row.category}</span></div>
          <div className="flex items-center gap-1.5"><Calendar size={11} className="flex-shrink-0"/><span>{fmtDate(row.requestedDate)}</span></div>
          <div className="col-span-2 flex items-center gap-1.5"><User size={11} className="flex-shrink-0"/><span className="truncate">{row.requestedBy}</span></div>
        </div>

        {row.reason && (
          <div className="bg-tn-light rounded-lg px-3 py-2 text-xs text-tn-navy border border-tn-border">
            <span className="text-tn-muted font-semibold">Reason: </span>{row.reason}
          </div>
        )}

        {row.remarks && (
          <div className="bg-tn-light rounded-lg px-3 py-2 text-xs text-tn-navy border border-tn-border">
            <span className="text-tn-muted font-semibold">Remarks: </span>{row.remarks}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-tn-muted flex items-center gap-1"><FileText size={11}/>{row.documentCount} docs</span>
        </div>
      </div>

      <div className={`grid ${editable ? "grid-cols-2" : "grid-cols-1"} gap-2 pt-3 border-t border-tn-border mt-auto`}>
        {editable && (
          <button
            onClick={startEdit}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-tn-blue hover:bg-tn-navy text-white transition-all"
          >
            <Pencil size={13} />
            <span>Edit</span>
          </button>
        )}
        <button
          onClick={() => onView(row)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-tn-border text-tn-navy bg-white hover:bg-tn-light transition-all"
        >
          <Eye size={13} />
          <span>View</span>
        </button>
      </div>
    </div>
  );
}

// ─── Simple Pagination ────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-tn-border text-tn-navy disabled:opacity-40 disabled:cursor-not-allowed hover:bg-tn-cream"
      >
        Prev
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 text-xs font-semibold rounded-lg ${p === currentPage ? "bg-tn-blue text-white" : "border border-tn-border text-tn-navy hover:bg-tn-cream"}`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-tn-border text-tn-navy disabled:opacity-40 disabled:cursor-not-allowed hover:bg-tn-cream"
      >
        Next
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TenderFinancialReviewPage() {
  const { apiFetch } = useApi();

  const [applyRows, setApplyRows] = useState([]);
  const [appliedRows, setAppliedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  // Apply / Applied tabs
  const [activeTab, setActiveTab] = useState("apply");
  const [animating, setAnimating] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  // View modal
  const [viewRow, setViewRow] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [applyRes, appliedRes] = await Promise.all([
        apiFetch("/financial-changes/apply"),
        apiFetch("/financial-changes/applied"),
      ]);
      setApplyRows(applyRes.requests || []);
      setAppliedRows(appliedRes.requests || []);
    } catch (err) {
      setLoadError(err.message || "Failed to load tenders.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function switchTab(id) {
    if (id === activeTab) return;
    setAnimating(true);
    setKeyword("");
    setPage(1);
    setTimeout(() => {
      setActiveTab(id);
      setAnimating(false);
    }, 200);
  }

  const tabRows = activeTab === "apply" ? applyRows : appliedRows;

  const filtered = useMemo(() => {
    let r = [...tabRows];
    const q = keyword.trim().toLowerCase();
    if (q) r = r.filter((t) => [t.tenderCode, t.projectName, t.department].some((f) => (f || "").toLowerCase().includes(q)));
    r.sort((a, b) => new Date(b.requestedDate) - new Date(a.requestedDate));
    return r;
  }, [tabRows, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleReset = () => { setKeyword(""); setPage(1); };

  function handleView(row) {
    setViewRow(row);
  }

  async function handleEditSave(row, newAmount, reason) {
    setSavingId(row.changeId);
    try {
      const res = await apiFetch(`/financial-changes/${row.tenderId}`, {
        method: "PATCH",
        body: JSON.stringify({ revisedAmount: newAmount, reason }),
      });

      const updated = res.request;

      // Amount actually changed -> tender moves from Apply to Applied.
      if (updated.status === "Applied") {
        setApplyRows((prev) => prev.filter((r) => r.changeId !== row.changeId));
        setAppliedRows((prev) => [updated, ...prev.filter((r) => r.changeId !== row.changeId)]);
      } else {
        // No-op (amount unchanged) — just refresh in place.
        setApplyRows((prev) => prev.map((r) => (r.changeId === row.changeId ? updated : r)));
      }

      setToast({ type: "edit", tenderId: row.tenderCode, projectName: row.projectName, amount: newAmount });
    } catch (err) {
      setToast({ type: "error", tenderId: row.tenderCode, projectName: err.message || "Update failed" });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">

      <Toast toast={toast} onClose={() => setToast(null)}/>

      {/* View modal */}
      {viewRow && (
        <div className="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center p-4" onClick={() => setViewRow(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-bold text-tn-navy">{viewRow.projectName}</h3>
              <button onClick={() => setViewRow(null)} className="text-tn-muted hover:text-tn-navy"><X size={18}/></button>
            </div>
            <p className="text-xs font-mono text-tn-muted mb-4">{viewRow.tenderCode}</p>
            <div className="space-y-2 text-sm text-tn-navy">
              <div className="flex justify-between"><span className="text-tn-muted">Department</span><span className="font-semibold">{viewRow.department}</span></div>
              <div className="flex justify-between"><span className="text-tn-muted">District</span><span className="font-semibold">{viewRow.district}</span></div>
              <div className="flex justify-between"><span className="text-tn-muted">Category</span><span className="font-semibold">{viewRow.category}</span></div>
              <div className="flex justify-between"><span className="text-tn-muted">Original Cost</span><span className="font-semibold">{fmt(viewRow.originalCost)}</span></div>
              <div className="flex justify-between"><span className="text-tn-muted">Revised Cost</span><span className="font-semibold">{fmt(viewRow.revisedCost)}</span></div>
              <div className="flex justify-between items-center"><span className="text-tn-muted">Status</span><StatusBadge status={viewRow.status}/></div>
              {viewRow.reason && <p className="pt-2 border-t border-tn-border text-tn-navy"><span className="text-tn-muted font-semibold">Reason: </span>{viewRow.reason}</p>}
              {viewRow.remarks && <p className="pt-2 border-t border-tn-border text-tn-muted">{viewRow.remarks}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-tn-muted mb-3">
        <span>Home</span><ChevronRight size={12}/><span>Department Head</span><ChevronRight size={12}/><span className="text-tn-blue font-semibold">Tender Financial Changes</span>
      </div>

      <h1 className="text-2xl font-bold text-tn-navy">Tender Financial Changes</h1>
      <p className="text-sm text-tn-muted mt-1 mb-6">Review and update the amount for your department's tenders.</p>

      {loading ? (
        <div className="bg-white rounded-xl border border-tn-border p-12 text-center">
          <Loader2 size={28} className="text-tn-blue mx-auto mb-3 animate-spin"/>
          <p className="text-tn-muted text-sm">Loading tenders…</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-xl border border-tn-danger p-8 text-center">
          <AlertTriangle size={28} className="text-tn-danger mx-auto mb-3"/>
          <p className="text-tn-navy text-sm font-semibold mb-3">{loadError}</p>
          <button onClick={loadData} className="px-4 py-2 rounded-lg text-xs font-semibold bg-tn-blue hover:bg-tn-navy text-white">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-tn-border shadow-sm p-5 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-tn-muted"/>
                <input type="text" value={keyword}
                  onChange={e => { setKeyword(e.target.value); setPage(1); }}
                  placeholder="Search by Tender Code, Project Name or Department"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-tn-border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40"
                />
              </div>
              {keyword.trim() && (
                <button type="button" onClick={handleReset} className="text-xs text-tn-muted underline whitespace-nowrap self-center sm:self-auto">Clear all</button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1">
              {[
                { id: "apply", label: "Apply", count: applyRows.length },
                { id: "applied", label: "Applied", count: appliedRows.length },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={[
                      "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-tn-navy text-white shadow-sm"
                        : "text-tn-blue border border-tn-border bg-transparent hover:bg-tn-cream",
                    ].join(" ")}
                  >
                    {tab.label}
                    <span className={["text-[10px] font-bold px-1.5 py-0.5 rounded-full", isActive ? "bg-white/20 text-white" : "bg-tn-cream text-tn-navy"].join(" ")}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="bg-tn-gold text-tn-navy text-xs font-bold px-3 py-1 rounded-full">Showing {filtered.length}</span>
          </div>

          <div className={`transition-opacity duration-150 ${animating ? "opacity-0" : "opacity-100"}`}>
            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-tn-border p-12 text-center">
                <BarChart2 size={36} className="text-tn-muted mx-auto mb-3"/>
                <p className="text-tn-muted text-sm">
                  No {activeTab === "apply" ? "pending" : "applied"} financial change requests found. Try adjusting your filters.
                </p>
              </div>
            )}

            {filtered.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paged.map((row) => (
                    <FinancialCard
                      key={row.changeId}
                      row={row}
                      editable={activeTab === "apply"}
                      saving={savingId === row.changeId}
                      onView={handleView}
                      onEditSave={handleEditSave}
                    />
                  ))}
                </div>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}/>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}