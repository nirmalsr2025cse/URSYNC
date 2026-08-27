// /src/pages/AddResources.jsx
import React, { useState, useEffect } from "react";
import {
  ChevronRight, Building2, MapPin, Boxes, ClipboardList, FileText,
  User, Phone, Mail, LocateFixed, CheckCircle2, X, AlertTriangle, Loader2, Tag,
  IndianRupee, LayoutGrid,
} from "lucide-react";
import { useApi } from "../api/client";

const CONDITIONS = [
  { value: "Good", cls: "border-tn-success text-tn-success bg-green-50" },
  { value: "Average", cls: "border-tn-warn text-tn-warn bg-orange-50" },
  { value: "Bad", cls: "border-tn-danger text-tn-danger bg-red-50" },
];

// Weight/impact classification — drives the category icon on the Search
// Resource cards. Kept as a simple 3-option pill group, same visual
// pattern as CONDITIONS above, rather than a native <select>, for
// consistency with the rest of this form.
const CATEGORIES = [
  { value: "Heavy", cls: "border-tn-danger text-tn-danger bg-red-50" },
  { value: "Medium", cls: "border-tn-warn text-tn-warn bg-orange-50" },
  { value: "Low", cls: "border-tn-success text-tn-success bg-green-50" },
];

const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialForm = {
  resourceName: "",
  category: "Heavy",
  districtId: "",
  quantity: "",
  condition: "Good",
  rentPerDay: "",
  description: "",
  specifications: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  location: "",
};

function FieldLabel({ icon: Icon, required, children }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-tn-navy mb-1.5">
      {Icon && <Icon size={13} className="text-tn-blue" />}
      {children}
      {required && <span className="text-tn-danger">*</span>}
    </label>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p className="text-xs text-tn-danger mt-1">{children}</p>;
}

export default function AddResources() {
  const { apiFetch } = useApi();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedResourceId, setSubmittedResourceId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtsError, setDistrictsError] = useState("");

  // Current user's department — fetched from GET /resources/department,
  // which resolves it server-side from req.departmentId (the auth token),
  // never trusted from the client. This is what actually returns the
  // department NAME instead of the raw ObjectId localStorage only has.
  const [departmentName, setDepartmentName] = useState("");
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [departmentError, setDepartmentError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadDepartment() {
      try {
        setDepartmentLoading(true);
        const data = await apiFetch("/resources/department");
        if (!cancelled) {
          setDepartmentName(data.department?.name || "");
          if (!data.department) setDepartmentError("No department assigned to your account.");
        }
      } catch (err) {
        if (!cancelled) setDepartmentError(err.message || "Failed to load department.");
      } finally {
        if (!cancelled) setDepartmentLoading(false);
      }
    }
    loadDepartment();
    return () => { cancelled = true; };
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    async function loadDistricts() {
      try {
        setDistrictsLoading(true);
        const data = await apiFetch("/resources/districts");
        if (!cancelled) setDistricts(data.districts || data || []);
      } catch (err) {
        if (!cancelled) setDistrictsError(err.message || "Failed to load districts.");
      } finally {
        if (!cancelled) setDistrictsLoading(false);
      }
    }
    loadDistricts();
    return () => { cancelled = true; };
  }, [apiFetch]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  function validate() {
    const next = {};
    if (!form.resourceName.trim()) next.resourceName = "Resource name is required.";
    if (!form.districtId) next.districtId = "Select a district.";
    if (!form.quantity || Number(form.quantity) <= 0) next.quantity = "Enter a valid quantity.";
    if (form.rentPerDay === "" || Number(form.rentPerDay) < 0 || Number.isNaN(Number(form.rentPerDay)))
      next.rentPerDay = "Enter a valid rent per day.";
    if (!form.description.trim()) next.description = "Description is required.";
    if (!form.specifications.trim()) next.specifications = "Specifications are required.";
    if (!form.contactName.trim()) next.contactName = "Contact person name is required.";
    if (!PHONE_REGEX.test(form.contactPhone.trim())) next.contactPhone = "Enter a valid 10-digit mobile number.";
    if (!EMAIL_REGEX.test(form.contactEmail.trim())) next.contactEmail = "Enter a valid email address.";
    if (!form.location.trim()) next.location = "Exact location is required.";
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setSubmitted(false);
      return;
    }

    const payload = {
      resourceName: form.resourceName.trim(),
      category: form.category,
      districtId: form.districtId,
      quantity: Number(form.quantity),
      condition: form.condition,
      rentPerDay: Number(form.rentPerDay),
      description: form.description.trim(),
      specifications: form.specifications.trim(),
      contactPerson: {
        name: form.contactName.trim(),
        phone: form.contactPhone.trim(),
        email: form.contactEmail.trim(),
      },
      location: form.location.trim(),
      // departmentId is intentionally NOT sent — the server always
      // resolves it from the authenticated user (req.departmentId).
      // resourceId is intentionally NOT sent — the server always
      // generates it (RS-001, RS-002, ...) from an atomic counter, so
      // it can never be spoofed or collide across concurrent submitters.
    };

    try {
      setSubmitting(true);
      const data = await apiFetch("/resources", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSubmittedResourceId(data.resource?.resourceId || "");
      setSubmitted(true);
      setForm(initialForm);
      setErrors({});
    } catch (err) {
      setSubmitError(err.message || "Failed to add resource. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm(initialForm);
    setErrors({});
    setSubmitted(false);
    setSubmitError("");
  }

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40 transition-colors";
  const borderCls = (field) => (errors[field] ? "border-tn-danger" : "border-tn-border");

  return (
    <div className="p-4 sm:p-6 w-full">
      {submitted && (
        <div className="fixed top-5 right-5 z-[100] animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-start gap-3 rounded-xl shadow-xl border border-tn-success px-4 py-3 max-w-sm bg-white">
            <div className="p-1.5 rounded-full flex-shrink-0 bg-green-100 text-tn-success">
              <CheckCircle2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-tn-navy">Resource Added</p>
              <p className="text-xs text-tn-muted mt-0.5">
                {submittedResourceId ? `Saved as ${submittedResourceId}.` : "Saved successfully."}
              </p>
            </div>
            <button onClick={() => setSubmitted(false)} className="text-tn-muted hover:text-tn-navy flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-tn-muted mb-3">
        <span>Home</span>
        <ChevronRight size={12} />
        <span className="text-tn-blue font-semibold">Add Resources</span>
      </div>

      <h1 className="text-2xl font-bold text-tn-navy">Add Resources</h1>
      <p className="text-sm text-tn-muted mt-1 mb-6">
        Register available department resources so they can be tracked and allocated.
      </p>

      {submitError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border border-tn-danger bg-red-50 text-sm text-tn-danger">
          <AlertTriangle size={14} />
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-tn-border shadow-sm p-6 flex flex-col gap-6">
        <div>
          <FieldLabel icon={Building2}>Department</FieldLabel>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-tn-border bg-tn-cream text-sm font-semibold text-tn-navy">
            <Building2 size={15} className="text-tn-blue" />
            {departmentLoading
              ? "Loading department..."
              : departmentName || "No department assigned"}
          </div>
          {departmentError && <ErrorText>{departmentError}</ErrorText>}
        </div>

        <div className="h-px bg-tn-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <FieldLabel icon={Tag} required>Resource Name</FieldLabel>
            <input
              type="text"
              value={form.resourceName}
              onChange={(e) => update("resourceName", e.target.value)}
              placeholder="e.g. Generator Set, Water Tanker"
              className={`${inputCls} ${borderCls("resourceName")}`}
            />
            <ErrorText>{errors.resourceName}</ErrorText>
          </div>

          <div>
            <FieldLabel icon={MapPin} required>District</FieldLabel>
            <select
              value={form.districtId}
              onChange={(e) => update("districtId", e.target.value)}
              disabled={districtsLoading}
              className={`${inputCls} ${borderCls("districtId")} bg-white`}
            >
              <option value="">
                {districtsLoading ? "Loading districts..." : "Select district"}
              </option>
              {districts.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            {districtsError && <ErrorText>{districtsError}</ErrorText>}
            <ErrorText>{errors.districtId}</ErrorText>
          </div>

          <div>
            <FieldLabel icon={Boxes} required>Quantity</FieldLabel>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
              placeholder="e.g. 25"
              className={`${inputCls} ${borderCls("quantity")}`}
            />
            <ErrorText>{errors.quantity}</ErrorText>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <FieldLabel icon={LayoutGrid} required>Category</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const isActive = form.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => update("category", c.value)}
                    className={[
                      "px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all",
                      isActive ? c.cls : "border-tn-border text-tn-muted bg-white hover:bg-tn-cream",
                    ].join(" ")}
                  >
                    {c.value}
                  </button>
                );
              })}
            </div>
            <ErrorText>{errors.category}</ErrorText>
          </div>

          <div>
            <FieldLabel icon={IndianRupee} required>Rent Per Day</FieldLabel>
            <input
              type="number"
              min="0"
              value={form.rentPerDay}
              onChange={(e) => update("rentPerDay", e.target.value)}
              placeholder="e.g. 1500"
              className={`${inputCls} ${borderCls("rentPerDay")}`}
            />
            <ErrorText>{errors.rentPerDay}</ErrorText>
          </div>
        </div>

        <div>
          <FieldLabel icon={ClipboardList} required>Condition</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => {
              const isActive = form.condition === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update("condition", c.value)}
                  className={[
                    "px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all",
                    isActive ? c.cls : "border-tn-border text-tn-muted bg-white hover:bg-tn-cream",
                  ].join(" ")}
                >
                  {c.value}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-tn-border" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <FieldLabel icon={FileText} required>Description</FieldLabel>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Brief description of the resource"
              className={`${inputCls} ${borderCls("description")} resize-none`}
            />
            <ErrorText>{errors.description}</ErrorText>
          </div>

          <div>
            <FieldLabel icon={FileText} required>Specifications</FieldLabel>
            <textarea
              rows={4}
              value={form.specifications}
              onChange={(e) => update("specifications", e.target.value)}
              placeholder="Technical specifications, dimensions, capacity, etc."
              className={`${inputCls} ${borderCls("specifications")} resize-none`}
            />
            <ErrorText>{errors.specifications}</ErrorText>
          </div>
        </div>

        <div className="h-px bg-tn-border" />

        <div>
          <p className="text-sm font-bold text-tn-navy mb-3">Contact Person</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <FieldLabel icon={User} required>Name</FieldLabel>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                placeholder="Full name"
                className={`${inputCls} ${borderCls("contactName")}`}
              />
              <ErrorText>{errors.contactName}</ErrorText>
            </div>

            <div>
              <FieldLabel icon={Phone} required>Phone Number</FieldLabel>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
                placeholder="10-digit mobile number"
                className={`${inputCls} ${borderCls("contactPhone")}`}
              />
              <ErrorText>{errors.contactPhone}</ErrorText>
            </div>

            <div>
              <FieldLabel icon={Mail} required>Email ID</FieldLabel>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                placeholder="name@tn.gov.in"
                className={`${inputCls} ${borderCls("contactEmail")}`}
              />
              <ErrorText>{errors.contactEmail}</ErrorText>
            </div>
          </div>
        </div>

        <div className="h-px bg-tn-border" />

        <div>
          <FieldLabel icon={LocateFixed} required>Location</FieldLabel>
          <input
            type="text"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Exact location — address, landmark, or site name"
            className={`${inputCls} ${borderCls("location")}`}
          />
          <ErrorText>{errors.location}</ErrorText>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-tn-border text-tn-navy hover:bg-tn-cream transition-all disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-tn-blue hover:bg-tn-navy text-white transition-all disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Saving..." : "Save Resource"}
          </button>
        </div>
      </form>
    </div>
  );
}