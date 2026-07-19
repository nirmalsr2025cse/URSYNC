// src/pages/TenderFinancialChangesPage.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Search, RotateCcw, FileText, Eye, CheckCircle,
  AlertTriangle, TrendingUp, TrendingDown, DollarSign, Calendar,
  Building2, MapPin, Tag, User, ClipboardList, MessageSquare,
  X, Wallet, BarChart2, Info, Clock, CheckCircle2, Pencil, Check,
} from "lucide-react";
import {
  DATA, fmt, fmtDate, pctChange, getStatus, getPriority, getChange,
  PAGE_SIZE, initFilters,
} from "../data/tenderFinancialData";
import Pagination from "../components/Pagination";

// ─── Badges ───────────────────────────────────────────────────────────────────
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
  const borderCls = isEdit ? "border-tn-blue" : isApprove ? "border-tn-success" : "border-tn-danger";
  const iconWrapCls = isEdit ? "bg-blue-100 text-tn-blue" : isApprove ? "bg-green-100 text-tn-success" : "bg-red-100 text-tn-danger";
  const title = isEdit ? "Amount Updated" : isApprove ? "Request Approved" : "Request Rejected";
  return (
    <div className="fixed top-5 right-5 z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div className={`flex items-start gap-3 rounded-xl shadow-xl border px-4 py-3 max-w-sm bg-white ${borderCls}`}>
        <div className={`p-1.5 rounded-full flex-shrink-0 ${iconWrapCls}`}>
          {isEdit ? <Pencil size={16}/> : isApprove ? <CheckCircle2 size={16}/> : <X size={16}/>}
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
function FinancialCard({ tender, onView, onQuery, onApprove, onReject, onEditSave }) {
  const [isEditing,  setIsEditing]  = useState(false);
  const [newAmount,  setNewAmount]  = useState(tender.revisedCost);
  const [revisedNow, setRevisedNow] = useState(tender.revisedCost);

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
    setRevisedNow(val);
    setIsEditing(false);
    onEditSave?.(tender, val);
  }

  return (
    <div className="h-full bg-white rounded-xl border border-tn-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-tn-muted">{tender.tenderId}</p>
          <h3 className="text-sm font-bold text-tn-navy mt-0.5 leading-snug">{tender.projectName}</h3>
        </div>
        <PriorityBadge priority={tender.priority}/>
      </div>

      {/* Flexible content block — grows to fill space so actions align across cards */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Change type */}
        <ChangeBadge changeType={tender.changeType}/>

        {/* Cost comparison / Edit confirmation box */}
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
              <button
                onClick={saveEdit}
                className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold bg-tn-success hover:bg-green-700 text-white transition-all"
              >
                <Check size={13}/><span>Save</span>
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold bg-tn-border hover:bg-slate-300 text-tn-navy transition-all"
              >
                <X size={13}/><span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-tn-cream rounded-xl p-3 border border-tn-border flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-tn-muted font-medium">Original Cost</span>
              <span className="font-bold text-tn-navy">{fmt(tender.originalCost)}</span>
            </div>
            <div className="h-px bg-tn-border"/>
            <div className="flex items-center justify-between text-xs">
              <span className="text-tn-muted font-medium">Revised Cost</span>
              <span className={`font-bold ${revisedNow > tender.originalCost ? "text-tn-danger" : revisedNow < tender.originalCost ? "text-tn-success" : "text-tn-navy"}`}>
                {fmt(revisedNow)}
              </span>
            </div>
            <div className="h-px bg-tn-border"/>
            <div className="flex items-center justify-between">
              <span className="text-xs text-tn-muted font-medium">Net Change</span>
              <CostDiff original={tender.originalCost} revised={revisedNow}/>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-tn-muted">
          <div className="flex items-center gap-1.5"><Building2 size={11} className="flex-shrink-0"/><span className="truncate">{tender.organization}</span></div>
          <div className="flex items-center gap-1.5"><MapPin size={11} className="flex-shrink-0"/><span>{tender.district}</span></div>
          <div className="flex items-center gap-1.5"><Tag size={11} className="flex-shrink-0"/><span>{tender.category}</span></div>
          <div className="flex items-center gap-1.5"><Calendar size={11} className="flex-shrink-0"/><span>{fmtDate(tender.requestedDate)}</span></div>
          <div className="col-span-2 flex items-center gap-1.5"><User size={11} className="flex-shrink-0"/><span className="truncate">{tender.requestedBy}</span></div>
        </div>

        {/* Reason */}
        <div className="bg-tn-light rounded-lg px-3 py-2 text-xs text-tn-navy border border-tn-border">
          <span className="text-tn-muted font-semibold">Reason: </span>{tender.changeReason}
        </div>

        {/* Status + docs */}
        <div className="flex items-center justify-between">
          <StatusBadge status={tender.status}/>
          <span className="text-xs text-tn-muted flex items-center gap-1"><FileText size={11}/>{tender.documents.length} docs</span>
        </div>
      </div>

      {/* Actions — pinned to bottom so all cards line up, card size unchanged */}
      <div className="grid grid-cols-5 gap-1.5 pt-3 border-t border-tn-border mt-auto">
        <button
          onClick={() => onView(tender)}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-blue hover:bg-tn-navy text-white transition-all"
        >
          <Eye size={12} />
          <span>View</span>
        </button>

        <button
          onClick={startEdit}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-indigo-500 hover:bg-indigo-700 text-white transition-all"
        >
          <Pencil size={12} />
          <span>Edit</span>
        </button>

        <button
          onClick={() => onApprove(tender)}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-success hover:bg-green-700 text-white transition-all"
        >
          <CheckCircle size={12} />
          <span>Approve</span>
        </button>

        <button
          onClick={() => onReject(tender)}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-danger hover:bg-red-700 text-white transition-all"
        >
          <X size={12} />
          <span>Reject</span>
        </button>

        <button
          onClick={() => onQuery(tender)}
          className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-semibold bg-tn-warn hover:bg-orange-600 text-white transition-all"
        >
          <MessageSquare size={12} />
          <span>Query</span>
        </button>
      </div>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────
function SummaryCards({ data }) {
  const totalRevision  = data.reduce((s,t)=>s+(t.revisedCost-t.originalCost),0);
  const pending        = data.filter(d=>d.status==="Pending Approval").length;
  const highPriority   = data.filter(d=>d.priority==="High").length;
  const cards = [
    { label:"Total Requests",   value:data.length,   icon:ClipboardList, color:"bg-tn-blue",    light:"bg-blue-50" },
    { label:"Pending Approval", value:pending,        icon:Clock,         color:"bg-tn-warn",    light:"bg-orange-50" },
    { label:"High Priority",    value:highPriority,   icon:AlertTriangle, color:"bg-tn-danger",  light:"bg-red-50" },
    { label:"Net Cost Impact",  value:fmt(totalRevision), icon:Wallet,    color:"bg-purple-600", light:"bg-purple-50", isText:true },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(({label,value,icon:Icon,color,light,isText})=>(
        <div key={label} className={`${light} rounded-xl border border-tn-border p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default`}>
          <div className={`${color} text-white p-3 rounded-xl flex-shrink-0`}><Icon size={22}/></div>
          <div>
            <p className={`${isText?"text-base":"text-2xl"} font-extrabold text-tn-navy leading-tight`}>{value}</p>
            <p className="text-xs text-tn-muted font-medium mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter Select ─────────────────────────────────────────────────────────────
function Sel({label,value,onChange,options}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-tn-muted mb-1 block uppercase tracking-wide">{label}</label>
      <select value={value} onChange={onChange} className="w-full text-sm border border-tn-border rounded-lg px-3 py-2 bg-white text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/40">
        <option value="">All</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TenderFinancialChangesPage() {
  const navigate = useNavigate();

  const [keyword,        setKeyword]        = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [filters,        setFilters]        = useState(initFilters);
  const [page,           setPage]           = useState(1);
  const [toast,          setToast]          = useState(null);

  const filtered = useMemo(()=>{
    let r=[...DATA];
    const q=appliedKeyword.trim().toLowerCase();
    if(q) r=r.filter(t=>[t.tenderId,t.projectName,t.organization,t.department,t.district].some(f=>f.toLowerCase().includes(q)));
    if(filters.department)  r=r.filter(t=>t.department===filters.department);
    if(filters.category)    r=r.filter(t=>t.category===filters.category);
    if(filters.priority)    r=r.filter(t=>t.priority===filters.priority);
    if(filters.district)    r=r.filter(t=>t.district===filters.district);
    if(filters.status)      r=r.filter(t=>t.status===filters.status);
    if(filters.changeType)  r=r.filter(t=>t.changeType===filters.changeType);
    r.sort((a,b)=>new Date(b.requestedDate)-new Date(a.requestedDate));
    return r;
  },[appliedKeyword,filters]);

  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paged      = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const setF = (k)=>(e)=>{setFilters(f=>({...f,[k]:e.target.value}));setPage(1);};
  const handleReset=()=>{setKeyword("");setAppliedKeyword("");setFilters(initFilters);setPage(1);};

  // ── Actions ─────────────────────────────────────────────────────────────
  function handleView(tender) {
    navigate("/financial-changes/details", { state: { tender, mode: "view" } });
  }
  function handleQuery(tender) {
    navigate("/financial-changes/details", { state: { tender, mode: "query" } });
  }
  function handleApprove(tender) {
    setToast({ type: "approve", tenderId: tender.tenderId, projectName: tender.projectName });
  }
  function handleReject(tender) {
    setToast({ type: "reject", tenderId: tender.tenderId, projectName: tender.projectName });
  }
  function handleEditSave(tender, newAmount) {
    setToast({ type: "edit", tenderId: tender.tenderId, projectName: tender.projectName, amount: newAmount });
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-tn-muted mb-3">
        <span>Home</span><ChevronRight size={12}/><span>Financial Department</span><ChevronRight size={12}/><span className="text-tn-blue font-semibold">Tender Financial Changes</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-tn-navy">Tender Financial Changes</h1>
      <p className="text-sm text-tn-muted mt-1 mb-6">Review and approve all financial revision requests submitted for active tenders.</p>

      {/* Summary Cards */}
      <SummaryCards data={filtered}/>

      {/* Info banner */}
      <div className="bg-tn-amber border border-tn-gold rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
        <Info size={16} className="text-tn-warn flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-tn-navy">Showing financial change requests for <strong>Financial Department — Tamil Nadu Water and Drainage Board</strong>. Backend will automatically filter by your department when connected.</p>
      </div>

      {/* Search card */}
      <div className="bg-white rounded-xl border border-tn-border shadow-sm p-5 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-tn-muted"/>
            <input type="text" value={keyword}
              onChange={e=>{setKeyword(e.target.value);setAppliedKeyword(e.target.value);setPage(1);}}
              onKeyDown={e=>e.key==="Enter"&&(setAppliedKeyword(keyword),setPage(1))}
              placeholder="Search by Tender ID, Project Name, Department or Organization"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-tn-border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40"
            />
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={()=>{setAppliedKeyword(keyword);setPage(1);}} className="flex items-center gap-2 bg-tn-blue hover:bg-tn-navy text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors">
              <Search size={15}/>Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-tn-muted  underline ml-1"
            >
              Clear all
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Sel label="Department"   value={filters.department}  onChange={setF("department")}  options={["Public Works Department","Highways Department","Rural Development","TANGEDCO","TWAD","Chennai Corporation","Health Department","Education Department","IT Department"]}/>
          <Sel label="Category"     value={filters.category}    onChange={setF("category")}    options={["Works","Goods","Services"]}/>
          <Sel label="Priority"     value={filters.priority}    onChange={setF("priority")}    options={["High","Medium","Low"]}/>
          <Sel label="District"     value={filters.district}    onChange={setF("district")}    options={["Chennai","Coimbatore","Salem","Madurai","Trichy","Erode","Thanjavur"]}/>
          <Sel label="Status"       value={filters.status}      onChange={setF("status")}      options={["Pending Approval","Under Review","Approved","Rejected"]}/>
          <Sel label="Change Type"  value={filters.changeType}  onChange={setF("changeType")}  options={["Cost Revision","Scope Addition","Scope Reduction","Cost Reduction","Quantity Addition","Specification Upgrade","Design Revision","Emergency Addition","Timeline Extension","Contract Extension","Time Extension + Cost"]}/>
        </div>
      </div>

      {/* Results header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-tn-muted"/>
          <h2 className="text-base font-bold text-tn-navy">Financial Change Requests</h2>
          <span className="bg-tn-gold text-tn-navy text-xs font-bold px-3 py-1 rounded-full">Showing {filtered.length}</span>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length===0&&(
        <div className="bg-white rounded-xl border border-tn-border p-12 text-center">
          <BarChart2 size={36} className="text-tn-muted mx-auto mb-3"/>
          <p className="text-tn-muted text-sm">No financial change requests found. Try adjusting your filters.</p>
        </div>
      )}

      {/* Results */}
      {filtered.length>0&&(
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paged.map(t=>(
              <FinancialCard
                key={t.tenderId}
                tender={t}
                onView={handleView}
                onQuery={handleQuery}
                onApprove={handleApprove}
                onReject={handleReject}
                onEditSave={handleEditSave}
              />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            />
        </>
      )}
    </div>
  );
}