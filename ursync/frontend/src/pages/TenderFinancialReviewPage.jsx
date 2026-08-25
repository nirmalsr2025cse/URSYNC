// src/pages/TenderFinancialReviewPage.jsx
//
// department_head page: reviews / approves / rejects / edits financial
// change requests for tenders in their OWN department, backed by:
//   GET   /api/review-financial-changes/requests
//   PATCH /api/review-financial-changes/:tenderCode/changes/:changeId/status
//   PATCH /api/review-financial-changes/:tenderCode/changes/:changeId
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Search, FileText, Eye, CheckCircle,
  AlertTriangle, TrendingUp, TrendingDown, Calendar,
  Building2, MapPin, Tag, User, ClipboardList, MessageSquare,
  X, Wallet, BarChart2, Info, Clock, CheckCircle2, Pencil, Check,
  Loader2,
} from "lucide-react";
import Pagination from "../components/Pagination";
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

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

// Backend only tracks Pending/Approved/Rejected on each appliedChanges entry
// (no separate priority/changeType fields on Tender or FinancialChange), so
// those two badges are derived here rather than fetched.
function getStatusBadgeCls(status) {
  if (status === "Approved") return { cls: "bg-green-50 text-tn-success", dot: "bg-tn-success" };
  if (status === "Rejected") return { cls: "bg-red-50 text-tn-danger", dot: "bg-tn-danger" };
  return { cls: "bg-orange-50 text-tn-warn", dot: "bg-tn-warn" };
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const c = getStatusBadgeCls(status);
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>{status}</span>;
}

// ─── Cost Change Indicator ────────────────────────────────────────────────────
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

// ─── Toast (pin message, top-right) ───────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isApprove = toast.type === "approve";
  const isEdit    = toast.type === "edit";
  const isError   = toast.type === "error";
  const borderCls = isError ? "border-tn-danger" : isEdit ? "border-tn-blue" : isApprove ? "border-tn-success" : "border-tn-danger";
  const iconWrapCls = isError ? "bg-red-100 text-tn-danger" : isEdit ? "bg-blue-100 text-tn-blue" : isApprove ? "bg-green-100 text-tn-success" : "bg-red-100 text-tn-danger";
  const title = isError ? "Something went wrong" : isEdit ? "Amount Updated" : isApprove ? "Request Approved" : "Request Rejected";
  return (
    <div className="fixed top-5 right-5 z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div className={`flex items-start gap-3 rounded-xl shadow-xl border px-4 py-3 max-w-sm bg-white ${borderCls}`}>
        <div className={`p-1.5 rounded-full flex-shrink-0 ${iconWrapCls}`}>
          {isError ? <AlertTriangle size={16}/> : isEdit ? <Pencil size={16}/> : isApprove ? <CheckCircle2 size={16}/> : <X size={16}/>}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-tn-navy">{title}</p>
          <p className="text-xs text-tn-muted mt-0.5 truncate">
            {toast.tenderId} — {toast.projectName}{isEdit ? ` (New: ${fmt(toast.amount)})` : ""}
          </p>
        </div>
        <button onClick={onClose} className="text-tn-muted hover:text-tn-navy flex-shrink-0"><X size={14}/></button>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function FinancialCard({ row, onView, onQuery, onApprove, onReject, onEditSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newAmount, setNewAmount] = useState(row.revisedCost);

  function startEdit() {
    setNewAmount(row.revisedCost);
    setIsEditing(true);
  }
  function cancelEdit() {
    setIsEditing(false);
    setNewAmount(row.revisedCost);
  }
  function saveEdit() {
    const val = parseFloat(newAmount);
    if (isNaN(val) || val < 0) return;
    setIsEditing(false);
    onEditSave(row, val);
  }

  return (
    <div className="h-full bg-white rounded-xl border border-tn-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-tn-muted">{row.tenderCode}</p>
          <h3 className="text-sm font-bold text-tn-navy mt-0.5 leading-snug">{row.projectName}</h3>
        </div>
        <StatusBadge status={row.status}/>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {/* Cost comparison / Edit box */}
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
            <div className="grid grid-cols-2 gap-2">
              <button onClick={saveEdit} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold bg-tn-success hover:bg-green-700 text-white transition-all">
                <Check size={13}/><span>Save</span>
              </button>
              <button onClick={cancelEdit} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold bg-tn-border hover:bg-slate-300 text-tn-navy transition-all">
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

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-tn-muted">
          <div className="flex items-center gap-1.5"><Building2 size={11} className="flex-shrink-0"/><span className="truncate">{row.department}</span></div>
          <div className="flex items-center gap-1.5"><MapPin size={11} className="flex-shrink-0"/><span>{row.district}</span></div>
          <div className="flex items-center gap-1.5"><Tag size={11} className="flex-shrink-0"/><span>{row.category}</span></div>
          <div className="flex items-center gap-1.5"><Calendar size={11} className="flex-shrink-0"/><span>{fmtDate(row.requestedDate)}</span></div>
          <div className="col-span-2 flex items-center gap-1.5"><User size={11} className="flex-shrink-0"/><span className="truncate">{row.requestedBy}</span></div>
        </div>

        {/* Reason / remarks */}
        {row.remarks && (
          <div className="bg-tn-light rounded-lg px-3 py-2 text-xs text-tn-navy border border-tn-border">
            <span className="text-tn-muted font-semibold">Remarks: </span>{row.remarks}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-tn-muted flex items-center gap-1"><FileText size={11}/>{row.documentCount} docs</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-tn-border mt-auto">
        <button onClick={() => onView(row)} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-blue hover:bg-tn-navy text-white transition-all">
          <Eye size={12}/><span>View</span>
        </button>
        <button onClick={startEdit} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-indigo-500 hover:bg-indigo-700 text-white transition-all">
          <Pencil size={12}/><span>Edit</span>
        </button>
        <button onClick={() => onApprove(row)} disabled={row.status === "Approved"} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-success hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">
          <CheckCircle size={12}/><span>Approve</span>
        </button>
        <button onClick={() => onReject(row)} disabled={row.status === "Rejected"} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-danger hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">
          <X size={12}/><span>Reject</span>
        </button>
      </div>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────
function SummaryCards({ rows }) {
  const totalRevision = rows.reduce((s, r) => s + (r.revisedCost - r.originalCost), 0);
  const pending = rows.filter((r) => r.status === "Pending").length;
  const cards = [
    { label: "Total Requests", value: rows.length, icon: ClipboardList, color: "bg-tn-blue", light: "bg-blue-50" },
    { label: "Pending Approval", value: pending, icon: Clock, color: "bg-tn-warn", light: "bg-orange-50" },
    { label: "Net Cost Impact", value: fmt(totalRevision), icon: Wallet, color: "bg-purple-600", light: "bg-purple-50", isText: true },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {cards.map(({ label, value, icon: Icon, color, light, isText }) => (
        <div key={label} className={`${light} rounded-xl border border-tn-border p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default`}>
          <div className={`${color} text-white p-3 rounded-xl flex-shrink-0`}><Icon size={22}/></div>
          <div>
            <p className={`${isText ? "text-base" : "text-2xl"} font-extrabold text-tn-navy leading-tight`}>{value}</p>
            <p className="text-xs text-tn-muted font-medium mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-tn-muted mb-1 block uppercase tracking-wide">{label}</label>
      <select value={value} onChange={onChange} className="w-full text-sm border border-tn-border rounded-lg px-3 py-2 bg-white text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/40">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// Flattens each tender's latest appliedChanges entry into a single row the
// card/filters work with.
function toRow(tender) {
  const changes = tender.financialChange?.appliedChanges || [];
  const latest = changes[changes.length - 1];
  return {
    tenderCode: tender.tenderCode,
    projectName: tender.title,
    department: tender.departmentId?.name || "-",
    district: tender.districtId?.name || tender.location || "-",
    category: tender.categoryId?.name || "-",
    requestedBy: latest?.userId?.fullName || "-",
    requestedDate: latest?.dateOfChange,
    originalCost: latest?.originalCost ?? tender.estimatedValue,
    revisedCost: latest?.revisedCost ?? tender.estimatedValue,
    remarks: latest?.remarks || "",
    status: latest?.status || "Pending",
    documentCount: tender.documentUrl ? 1 : 0,
    changeId: latest?._id,
    _tender: tender,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TenderFinancialReviewPage() {
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const currentUser = getCurrentUser(); // { _id, fullName, departmentId, roleId, ... } — as stored at login

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [filters, setFilters] = useState({ department: "", category: "", district: "", status: "" });
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  // department_head only ever reviews tenders in their OWN department —
  // authMiddleware.js sets req.departmentId from the DB record for this
  // role, so the query param here is a convenience for the backend's
  // req.query.departmentId fallback, not something the client can spoof
  // its way around (the backend re-derives departmentId from the token).
  const loadRequests = useCallback(async () => {
    if (!currentUser?.departmentId) {
      setLoading(false);
      setLoadError("No department found for the current user.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/review-financial-changes/requests?departmentId=${currentUser.departmentId}`);
      setRows((data.requests || []).map(toRow));
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message || "Failed to load financial change requests.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, currentUser?.departmentId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered = useMemo(() => {
    let r = [...rows];
    const q = appliedKeyword.trim().toLowerCase();
    if (q) r = r.filter((t) => [t.tenderCode, t.projectName, t.department].some((f) => f.toLowerCase().includes(q)));
    if (filters.department) r = r.filter((t) => t.department === filters.department);
    if (filters.category) r = r.filter((t) => t.category === filters.category);
    if (filters.district) r = r.filter((t) => t.district === filters.district);
    if (filters.status) r = r.filter((t) => t.status === filters.status);
    r.sort((a, b) => new Date(b.requestedDate) - new Date(a.requestedDate));
    return r;
  }, [rows, appliedKeyword, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const setF = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const handleReset = () => { setKeyword(""); setAppliedKeyword(""); setFilters({ department: "", category: "", district: "", status: "" }); setPage(1); };

  const departmentOptions = useMemo(() => [...new Set(rows.map((r) => r.department))], [rows]);
  const categoryOptions   = useMemo(() => [...new Set(rows.map((r) => r.category))], [rows]);
  const districtOptions   = useMemo(() => [...new Set(rows.map((r) => r.district))], [rows]);

  function handleView(row) {
    navigate("/financial-changes/details", {
      state: {
        tender: {
          tenderId: row.tenderCode,
          tenderCode: row.tenderCode,
          projectName: row.projectName,
          organization: row.department,
          department: row.department,
          district: row.district,
          category: row.category,
          requestedBy: row.requestedBy,
          requestedDate: row.requestedDate,
          originalCost: row.originalCost,
          revisedCost: row.revisedCost,
          changeReason: row.remarks,
          documents: row._tender.documentUrl ? [row._tender.documentUrl] : [],
          priority: "Medium",
          status: row.status,
          changeType: "Cost Revision",
        },
        mode: "view",
      },
    });
  }
  function handleQuery(row) {
    navigate("/financial-changes/details", { state: { tender: { ...row }, mode: "query" } });
  }

  async function handleApprove(row) {
    try {
      await apiFetch(`/review-financial-changes/${row.tenderCode}/changes/${row.changeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Approved" }),
      });
      setToast({ type: "approve", tenderId: row.tenderCode, projectName: row.projectName });
      loadRequests();
    } catch (err) {
      setToast({ type: "error", tenderId: row.tenderCode, projectName: err.message });
    }
  }
  async function handleReject(row) {
    try {
      await apiFetch(`/review-financial-changes/${row.tenderCode}/changes/${row.changeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Rejected" }),
      });
      setToast({ type: "reject", tenderId: row.tenderCode, projectName: row.projectName });
      loadRequests();
    } catch (err) {
      setToast({ type: "error", tenderId: row.tenderCode, projectName: err.message });
    }
  }
  async function handleEditSave(row, newAmount) {
    try {
      await apiFetch(`/review-financial-changes/${row.tenderCode}/changes/${row.changeId}`, {
        method: "PATCH",
        body: JSON.stringify({ revisedCost: newAmount }),
      });
      setToast({ type: "edit", tenderId: row.tenderCode, projectName: row.projectName, amount: newAmount });
      loadRequests();
    } catch (err) {
      setToast({ type: "error", tenderId: row.tenderCode, projectName: err.message });
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">

      <Toast toast={toast} onClose={() => setToast(null)}/>

      <div className="flex items-center gap-1.5 text-xs text-tn-muted mb-3">
        <span>Home</span><ChevronRight size={12}/><span>Department Head</span><ChevronRight size={12}/><span className="text-tn-blue font-semibold">Tender Financial Changes</span>
      </div>

      <h1 className="text-2xl font-bold text-tn-navy">Tender Financial Changes</h1>
      <p className="text-sm text-tn-muted mt-1 mb-6">Review and approve financial revision requests for your department's tenders.</p>

      {loading && (
        <div className="flex items-center justify-center py-16 text-tn-muted text-sm gap-2">
          <Loader2 size={18} className="animate-spin"/>Loading requests...
        </div>
      )}

      {!loading && loadError && (
        <div className="bg-white rounded-xl border border-tn-border p-12 text-center text-tn-danger text-sm">{loadError}</div>
      )}

      {!loading && !loadError && (
        <>
          <SummaryCards rows={filtered}/>

          <div className="bg-white rounded-xl border border-tn-border shadow-sm p-5 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-tn-muted"/>
                <input type="text" value={keyword}
                  onChange={e => { setKeyword(e.target.value); setAppliedKeyword(e.target.value); setPage(1); }}
                  onKeyDown={e => e.key === "Enter" && (setAppliedKeyword(keyword), setPage(1))}
                  placeholder="Search by Tender Code, Project Name or Department"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-tn-border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40"
                />
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }} className="flex items-center gap-2 bg-tn-blue hover:bg-tn-navy text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors">
                  <Search size={15}/>Search
                </button>
                <button type="button" onClick={handleReset} className="text-xs text-tn-muted underline ml-1">Clear all</button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Sel label="Department" value={filters.department} onChange={setF("department")} options={departmentOptions}/>
              <Sel label="Category" value={filters.category} onChange={setF("category")} options={categoryOptions}/>
              <Sel label="District" value={filters.district} onChange={setF("district")} options={districtOptions}/>
              <Sel label="Status" value={filters.status} onChange={setF("status")} options={["Pending", "Approved", "Rejected"]}/>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={18} className="text-tn-muted"/>
              <h2 className="text-base font-bold text-tn-navy">Financial Change Requests</h2>
              <span className="bg-tn-gold text-tn-navy text-xs font-bold px-3 py-1 rounded-full">Showing {filtered.length}</span>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-tn-border p-12 text-center">
              <BarChart2 size={36} className="text-tn-muted mx-auto mb-3"/>
              <p className="text-tn-muted text-sm">No financial change requests found. Try adjusting your filters.</p>
            </div>
          )}

          {filtered.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paged.map((row) => (
                  <FinancialCard
                    key={row.changeId || row.tenderCode}
                    row={row}
                    onView={handleView}
                    onQuery={handleQuery}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onEditSave={handleEditSave}
                  />
                ))}
              </div>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}/>
            </>
          )}
        </>
      )}
    </div>
  );
}