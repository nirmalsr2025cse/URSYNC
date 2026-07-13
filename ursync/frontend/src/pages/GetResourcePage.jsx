//GET RESOURSE PAGE 


import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, ArrowLeft, CheckCircle, Calendar, User,
  Building2, MapPin, FileText, Phone, Hash, AlertCircle,
  ClipboardList, Tag,
} from "lucide-react";
import RESOURCES from "../data/resourceData.js";

const FIELDS = [
  { id:"applicantName", label:"Applicant Full Name",   icon:User,         type:"text",     placeholder:"Enter your full name",                   required:true },
  { id:"designation",   label:"Designation",           icon:User,         type:"text",     placeholder:"e.g. Assistant Executive Engineer",        required:true },
  { id:"department",    label:"Department",            icon:Building2,    type:"select",   options:["Public Works Department","Highways Department","Rural Development","TANGEDCO","TWAD Board","Chennai Corporation","Health Department","Education Department"], required:true },
  { id:"organization",  label:"Organization / Board",  icon:Building2,    type:"text",     placeholder:"e.g. Tamil Nadu PWD",                     required:true },
  { id:"district",      label:"District of Use",       icon:MapPin,       type:"select",   options:["Chennai","Coimbatore","Salem","Madurai","Tiruchirappalli","Erode","Vellore","Thanjavur","Tirunelveli","Cuddalore"], required:true },
  { id:"projectName",   label:"Project Name",          icon:ClipboardList,type:"text",     placeholder:"Name of the project",                     required:true },
  { id:"projectId",     label:"Tender / Project ID",   icon:Hash,         type:"text",     placeholder:"e.g. TN/PWD/2026/045",                    required:true },
  { id:"purpose",       label:"Purpose of Use",        icon:FileText,     type:"textarea", placeholder:"Briefly describe how this resource will be used...", required:true },
  { id:"startDate",     label:"Required From Date",    icon:Calendar,     type:"date",     required:true },
  { id:"endDate",       label:"Required Until Date",   icon:Calendar,     type:"date",     required:true },
  { id:"contactNumber", label:"Contact Number",        icon:Phone,        type:"tel",      placeholder:"10-digit mobile number",                  required:true },
  { id:"remarks",       label:"Additional Remarks",    icon:FileText,     type:"textarea", placeholder:"Any additional notes (optional)",          required:false },
];

export default function GetResourcePage() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const resource  = state?.resource || RESOURCES[0];

  const [form,      setForm]      = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [errors,    setErrors]    = useState({});

  const allFilled = FIELDS.filter(f => f.required).every(f => {
    const val = form[f.id];
    return val && String(val).trim() !== "";
  });

  const handleChange = (id, value) => {
    setForm(prev => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }));
  };

  const validate = () => {
    const newErrors = {};
    FIELDS.filter(f => f.required).forEach(f => {
      if (!form[f.id] || !String(form[f.id]).trim()) newErrors[f.id] = true;
    });
    if (form.startDate && form.endDate && form.endDate < form.startDate) newErrors.endDate = true;
    if (form.contactNumber && !/^\d{10}$/.test(form.contactNumber.replace(/\s/g, ""))) newErrors.contactNumber = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApply = () => { if (validate()) setSubmitted(true); };

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    const refNo = `REQ/${new Date().getFullYear()}/${Math.floor(Math.random() * 90000) + 10000}`;
    return (
      <div className="p-4 sm:p-8 max-w-[700px] mx-auto">
        <div className="bg-white rounded-2xl border border-tn-border shadow-sm p-8 sm:p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-green-600"/>
          </div>
          <h2 className="text-2xl font-extrabold text-tn-navy mb-2">Request Submitted!</h2>
          <p className="text-sm text-tn-muted mb-6">Your resource request has been submitted successfully and is pending approval from the owner department.</p>

          <div className="bg-tn-cream rounded-xl border border-tn-border p-5 mb-6 text-left space-y-3">
            {[
              ["Reference Number", refNo,                  true],
              ["Resource",         resource.name,          false],
              ["Applicant",        form.applicantName,     false],
              ["Department",       form.department,        false],
              ["Period",           `${form.startDate} → ${form.endDate}`, false],
              ["Status",           "Pending Approval",     false],
            ].map(([label, value, mono]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-tn-muted font-medium">{label}</span>
                <span className={`font-bold ${label === "Status" ? "text-yellow-600" : mono ? "text-tn-blue font-mono" : "text-tn-navy"}`}>{value}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-tn-muted mb-6">Save your reference number <strong className="text-tn-navy">{refNo}</strong> to track your request status.</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate("/search-resource")}
              className="flex-1 py-3 rounded-xl bg-tn-blue hover:bg-tn-navy text-white text-sm font-bold transition-colors">
              Search More Resources
            </button>
            <button onClick={() => navigate("/")}
              className="flex-1 py-3 rounded-xl border border-tn-border text-tn-navy text-sm font-semibold hover:bg-tn-light transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form screen ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-8 max-w-[900px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-tn-muted mb-4 flex-wrap">
        <span>Home</span><ChevronRight size={12}/>
        <button onClick={() => navigate("/search-resource")} className="hover:text-tn-blue transition-colors">Search Resource</button>
        <ChevronRight size={12}/>
        <button onClick={() => navigate(-1)} className="hover:text-tn-blue transition-colors">{resource.name}</button>
        <ChevronRight size={12}/>
        <span className="text-tn-blue font-semibold">Get Resource</span>
      </div>

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-tn-muted hover:text-tn-navy font-medium mb-6 transition-colors">
        <ArrowLeft size={16}/> Back to Details
      </button>

      {/* Resource banner */}
      <div className="bg-tn-navy rounded-2xl p-5 mb-6 flex items-center gap-5 text-white">
        <img src={resource.image} alt={resource.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border-2 border-white/20"/>
        <div className="min-w-0">
          <p className="text-xs text-blue-300 font-medium mb-0.5">Requesting Resource</p>
          <h2 className="text-lg font-extrabold">{resource.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-blue-200">
            <span className="flex items-center gap-1"><Tag size={11}/>{resource.category}</span>
            <span className="flex items-center gap-1"><MapPin size={11}/>{resource.district}</span>
            <span className="flex items-center gap-1 font-bold text-yellow-300">₹{resource.dailyRate.toLocaleString("en-IN")}/day</span>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-tn-amber border border-tn-gold rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <AlertCircle size={16} className="text-tn-warn flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-tn-navy">All fields marked <span className="text-red-600 font-bold">*</span> are mandatory. The <strong>Apply</strong> button will only be enabled after all required fields are filled.</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-tn-border shadow-sm p-6 sm:p-8">
        <h2 className="text-base font-bold text-tn-navy mb-6 flex items-center gap-2">
          <ClipboardList size={18} className="text-tn-blue"/> Resource Request Form
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FIELDS.map(field => (
            <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-bold text-tn-muted uppercase tracking-wide mb-1.5">
                {field.label}{field.required && <span className="text-red-600 ml-1">*</span>}
              </label>

              {field.type === "select" ? (
                <div className="relative">
                  <field.icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tn-muted pointer-events-none"/>
                  <select value={form[field.id] || ""} onChange={e => handleChange(field.id, e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-tn-navy bg-white focus:outline-none focus:ring-2 focus:ring-tn-blue/40 appearance-none ${errors[field.id] ? "border-red-400 bg-red-50" : "border-tn-border"}`}>
                    <option value="">Select {field.label}</option>
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ) : field.type === "textarea" ? (
                <textarea rows={3} value={form[field.id] || ""} onChange={e => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40 resize-none ${errors[field.id] ? "border-red-400 bg-red-50" : "border-tn-border"}`}/>
              ) : (
                <div className="relative">
                  <field.icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tn-muted pointer-events-none"/>
                  <input type={field.type} value={form[field.id] || ""} onChange={e => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40 ${errors[field.id] ? "border-red-400 bg-red-50" : "border-tn-border"}`}/>
                </div>
              )}

              {errors[field.id] && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11}/>
                  {field.id === "endDate" ? "End date must be after start date."
                    : field.id === "contactNumber" ? "Enter a valid 10-digit number."
                    : `${field.label} is required.`}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Declaration */}
        <div className="mt-6 bg-tn-cream rounded-xl border border-tn-border p-4">
          <p className="text-xs text-tn-muted leading-relaxed">
            <span className="font-bold text-tn-navy">Declaration: </span>
            I hereby declare that the information provided is true and correct. I understand that the resource will be used solely for the government project mentioned above and will be returned in the same condition.
          </p>
        </div>

        {/* Submit buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button onClick={handleApply} disabled={!allFilled}
            className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
              ${allFilled
                ? "bg-tn-blue hover:bg-tn-navy text-white shadow-md hover:shadow-lg active:scale-[0.98]"
                : "bg-tn-blue text-white cursor-not-allowed opacity-30 blur-[1px] pointer-events-none select-none"
              }`}>
            <CheckCircle size={16}/> Apply for Resource
          </button>
          <button onClick={() => navigate(-1)}
            className="flex-1 py-3.5 rounded-xl border border-tn-border text-tn-navy text-sm font-semibold hover:bg-tn-light transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={15}/> Cancel
          </button>
        </div>

        {!allFilled && (
          <p className="text-xs text-tn-muted text-center mt-3 flex items-center justify-center gap-1">
            <AlertCircle size={12}/> Fill all required fields to enable the Apply button.
          </p>
        )}
      </div>
    </div>
  );
}