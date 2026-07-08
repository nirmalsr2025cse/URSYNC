// src/data/tenderFinancialData.js
import {
  RefreshCw, TrendingUp, TrendingDown, BarChart2,
  AlertTriangle, Clock, ArrowRightCircle,
} from "lucide-react";

// ─── Sample Data (20 records) ─────────────────────────────────────────────────
export const DATA = [
  { tenderId:"FD/2026/FC/001", projectName:"Construction of Rural Water Supply Scheme", organization:"TWAD Board", department:"Water Supply Department", district:"Madurai", category:"Works", originalCost:12750000, revisedCost:15200000, changeType:"Cost Revision", changeReason:"Material price escalation", requestedBy:"Executive Engineer", requestedDate:"2026-07-14", status:"Pending Approval", priority:"High", documents:["Revised BOQ","Price Escalation Report","Administrative Approval"] },
  { tenderId:"FD/2026/FC/002", projectName:"Widening of Salem-Coimbatore State Highway", organization:"Highways Department", department:"Highways Department", district:"Salem", category:"Works", originalCost:92000000, revisedCost:98500000, changeType:"Scope Addition", changeReason:"Additional lane construction approved", requestedBy:"Chief Engineer", requestedDate:"2026-07-13", status:"Under Review", priority:"High", documents:["Revised DPR","Scope Change Report","BOQ"] },
  { tenderId:"FD/2026/FC/003", projectName:"Procurement of IT Hardware for District Offices", organization:"Chennai Corporation", department:"IT Department", district:"Chennai", category:"Goods", originalCost:8400000, revisedCost:7900000, changeType:"Cost Reduction", changeReason:"Negotiated price with vendor", requestedBy:"Deputy Commissioner", requestedDate:"2026-07-12", status:"Approved", priority:"Medium", documents:["Revised BOQ","Vendor Quote","Approval Letter"] },
  { tenderId:"FD/2026/FC/004", projectName:"Construction of Government School Building", organization:"Tamil Nadu PWD", department:"Public Works Department", district:"Trichy", category:"Works", originalCost:34000000, revisedCost:39500000, changeType:"Time Extension + Cost", changeReason:"COVID delay and material shortage", requestedBy:"Assistant Executive Engineer", requestedDate:"2026-07-11", status:"Pending Approval", priority:"High", documents:["Revised Schedule","Cost Escalation Report","DPR"] },
  { tenderId:"FD/2026/FC/005", projectName:"Installation of Solar Street Lights", organization:"TANGEDCO", department:"TANGEDCO", district:"Erode", category:"Works", originalCost:7200000, revisedCost:7200000, changeType:"Scope Reduction", changeReason:"Reduced coverage area due to land dispute", requestedBy:"Divisional Engineer", requestedDate:"2026-07-10", status:"Rejected", priority:"Low", documents:["Revised Scope","Land Records","BOQ"] },
  { tenderId:"FD/2026/FC/006", projectName:"Laying of Underground Drainage Network", organization:"Chennai Corporation", department:"Public Works Department", district:"Chennai", category:"Works", originalCost:56000000, revisedCost:61000000, changeType:"Cost Revision", changeReason:"Soil condition worse than estimated", requestedBy:"Chief Engineer", requestedDate:"2026-07-09", status:"Under Review", priority:"High", documents:["Geo-technical Report","Revised BOQ","Administrative Approval"] },
  { tenderId:"FD/2026/FC/007", projectName:"Supply of Medical Equipment for PHCs", organization:"Health Department", department:"Health Department", district:"Coimbatore", category:"Goods", originalCost:5600000, revisedCost:6100000, changeType:"Quantity Addition", changeReason:"Additional PHCs included in scope", requestedBy:"District Health Officer", requestedDate:"2026-07-08", status:"Pending Approval", priority:"Medium", documents:["Revised BOQ","Demand Statement"] },
  { tenderId:"FD/2026/FC/008", projectName:"Construction of Bridge over Cauvery River", organization:"Tamil Nadu PWD", department:"Public Works Department", district:"Trichy", category:"Works", originalCost:145000000, revisedCost:158000000, changeType:"Design Revision", changeReason:"Revised load capacity requirements", requestedBy:"Chief Engineer", requestedDate:"2026-07-07", status:"Under Review", priority:"High", documents:["Revised Design","Structural Report","BOQ","Administrative Approval"] },
  { tenderId:"FD/2026/FC/009", projectName:"Electrical Works for New Sub-Station", organization:"TANGEDCO", department:"TANGEDCO", district:"Madurai", category:"Works", originalCost:38000000, revisedCost:41500000, changeType:"Cost Revision", changeReason:"GST rate change impact", requestedBy:"Superintending Engineer", requestedDate:"2026-07-06", status:"Approved", priority:"Medium", documents:["Revised BOQ","GST Calculation Sheet"] },
  { tenderId:"FD/2026/FC/010", projectName:"Procurement of Ambulances for District Hospitals", organization:"Health Department", department:"Health Department", district:"Erode", category:"Goods", originalCost:9800000, revisedCost:10600000, changeType:"Specification Upgrade", changeReason:"Advanced life support equipment required", requestedBy:"District Health Officer", requestedDate:"2026-07-05", status:"Pending Approval", priority:"High", documents:["Revised Specs","Technical Report","BOQ"] },
  { tenderId:"FD/2026/FC/011", projectName:"Renovation of Government Hospital OPD Block", organization:"Health Department", department:"Health Department", district:"Salem", category:"Works", originalCost:18500000, revisedCost:16800000, changeType:"Cost Reduction", changeReason:"Value engineering applied", requestedBy:"Superintendent", requestedDate:"2026-07-04", status:"Approved", priority:"Medium", documents:["Value Engineering Report","Revised BOQ"] },
  { tenderId:"FD/2026/FC/012", projectName:"Construction of Flood Protection Wall", organization:"Tamil Nadu PWD", department:"Public Works Department", district:"Coimbatore", category:"Works", originalCost:27500000, revisedCost:32000000, changeType:"Emergency Addition", changeReason:"Additional flood risk area identified", requestedBy:"Executive Engineer", requestedDate:"2026-07-03", status:"Under Review", priority:"High", documents:["Emergency Order","Revised DPR","BOQ"] },
  { tenderId:"FD/2026/FC/013", projectName:"Supply of School Uniforms and Textbooks", organization:"Education Department", department:"Education Department", district:"Chennai", category:"Goods", originalCost:3200000, revisedCost:3450000, changeType:"Quantity Addition", changeReason:"Enrollment increased beyond estimate", requestedBy:"District Education Officer", requestedDate:"2026-07-02", status:"Pending Approval", priority:"Low", documents:["Enrollment Data","Revised BOQ"] },
  { tenderId:"FD/2026/FC/014", projectName:"GIS Mapping Consultancy for Urban Areas", organization:"IT Department", department:"IT Department", district:"Trichy", category:"Services", originalCost:6100000, revisedCost:6100000, changeType:"Timeline Extension", changeReason:"Data collection delayed by 3 months", requestedBy:"Project Director", requestedDate:"2026-07-01", status:"Approved", priority:"Low", documents:["Revised Timeline","Progress Report"] },
  { tenderId:"FD/2026/FC/015", projectName:"Outsourcing of Sanitation Services", organization:"Chennai Corporation", department:"Public Works Department", district:"Chennai", category:"Services", originalCost:15600000, revisedCost:17200000, changeType:"Contract Extension", changeReason:"Service period extended by 6 months", requestedBy:"Commissioner", requestedDate:"2026-06-30", status:"Under Review", priority:"Medium", documents:["Extension Order","Revised Contract","BOQ"] },
  { tenderId:"FD/2026/FC/016", projectName:"Construction of Canal Lining under Irrigation Scheme", organization:"Tamil Nadu PWD", department:"Public Works Department", district:"Thanjavur", category:"Works", originalCost:34800000, revisedCost:37900000, changeType:"Cost Revision", changeReason:"Cement and steel price hike", requestedBy:"Executive Engineer", requestedDate:"2026-06-29", status:"Rejected", priority:"Medium", documents:["Market Rate Analysis","Revised BOQ"] },
  { tenderId:"FD/2026/FC/017", projectName:"Supply of Agricultural Machinery", organization:"Rural Development", department:"Rural Development", district:"Erode", category:"Goods", originalCost:11400000, revisedCost:12800000, changeType:"Specification Upgrade", changeReason:"Higher capacity machinery required", requestedBy:"District Collector", requestedDate:"2026-06-28", status:"Pending Approval", priority:"Medium", documents:["Technical Specs","Market Survey","BOQ"] },
  { tenderId:"FD/2026/FC/018", projectName:"Consultancy for e-Governance Platform", organization:"IT Department", department:"IT Department", district:"Chennai", category:"Services", originalCost:4500000, revisedCost:5200000, changeType:"Scope Addition", changeReason:"Mobile app module added to scope", requestedBy:"Project Manager", requestedDate:"2026-06-27", status:"Under Review", priority:"Medium", documents:["Revised Scope","Technical Proposal","BOQ"] },
  { tenderId:"FD/2026/FC/019", projectName:"Procurement of Departmental Vehicles", organization:"TANGEDCO", department:"TANGEDCO", district:"Coimbatore", category:"Goods", originalCost:18500000, revisedCost:19800000, changeType:"Cost Revision", changeReason:"Fuel efficiency norms compliance cost", requestedBy:"General Manager", requestedDate:"2026-06-26", status:"Approved", priority:"Low", documents:["Revised Quote","Compliance Report"] },
  { tenderId:"FD/2026/FC/020", projectName:"Laying of Drinking Water Pipeline Network", organization:"TWAD Board", department:"Water Supply Department", district:"Madurai", category:"Works", originalCost:15200000, revisedCost:17600000, changeType:"Emergency Addition", changeReason:"Extended pipeline to cover additional villages", requestedBy:"Assistant Executive Engineer", requestedDate:"2026-06-25", status:"Pending Approval", priority:"High", documents:["Emergency Order","Revised DPR","BOQ","Administrative Approval"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const fmt = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const pctChange = (orig, rev) => {
  if (!orig) return 0;
  return (((rev - orig) / orig) * 100).toFixed(1);
};

// ─── Config ───────────────────────────────────────────────────────────────────
export const STATUS_CFG = {
  "Pending Approval": { cls:"bg-yellow-100 text-yellow-700", dot:"bg-yellow-500" },
  "Under Review":     { cls:"bg-blue-100 text-tn-blue",      dot:"bg-tn-blue" },
  "Approved":         { cls:"bg-green-100 text-tn-success",  dot:"bg-tn-success" },
  "Rejected":         { cls:"bg-red-100 text-tn-danger",     dot:"bg-tn-danger" },
};

export const PRIORITY_CFG = {
  High:   { cls:"bg-red-100 text-red-700 border-red-200",       dot:"bg-red-500" },
  Medium: { cls:"bg-orange-100 text-orange-700 border-orange-200", dot:"bg-orange-400" },
  Low:    { cls:"bg-blue-100 text-tn-blue border-blue-200",     dot:"bg-tn-blue" },
};

export const CHANGE_CFG = {
  "Cost Revision":        { cls:"bg-orange-50 text-orange-700 border-orange-200",   icon:RefreshCw },
  "Scope Addition":       { cls:"bg-blue-50 text-tn-blue border-blue-200",          icon:TrendingUp },
  "Scope Reduction":      { cls:"bg-purple-50 text-purple-700 border-purple-200",   icon:TrendingDown },
  "Cost Reduction":       { cls:"bg-green-50 text-tn-success border-green-200",     icon:TrendingDown },
  "Quantity Addition":    { cls:"bg-sky-50 text-sky-700 border-sky-200",            icon:TrendingUp },
  "Specification Upgrade":{ cls:"bg-indigo-50 text-indigo-700 border-indigo-200",   icon:BarChart2 },
  "Design Revision":      { cls:"bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",icon:RefreshCw },
  "Emergency Addition":   { cls:"bg-red-50 text-red-700 border-red-200",            icon:AlertTriangle },
  "Timeline Extension":   { cls:"bg-yellow-50 text-yellow-700 border-yellow-200",   icon:Clock },
  "Contract Extension":   { cls:"bg-teal-50 text-teal-700 border-teal-200",         icon:ArrowRightCircle },
  "Time Extension + Cost":{ cls:"bg-rose-50 text-rose-700 border-rose-200",         icon:TrendingUp },
};

export const getStatus   = (s) => STATUS_CFG[s]   || STATUS_CFG["Pending Approval"];
export const getPriority = (p) => PRIORITY_CFG[p] || PRIORITY_CFG.Low;
export const getChange   = (c) => CHANGE_CFG[c]   || { cls:"bg-slate-50 text-slate-600 border-slate-200", icon:RefreshCw };

export const PAGE_SIZE = 6;
export const initFilters = { department:"", category:"", priority:"", district:"", status:"", changeType:"" };

// Tabs (mirrors the pill tab-bar pattern used in Reports & Feedbacks)
export const TENDER_TABS = [
  { id: "all",      label: "All" },
  { id: "works",    label: "Works" },
  { id: "goods",    label: "Goods" },
  { id: "services", label: "Services" },
];