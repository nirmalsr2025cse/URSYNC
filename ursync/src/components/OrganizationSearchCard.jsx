import React from "react";
import { Search, RotateCcw } from "lucide-react";

const popularOrganizations = [
  "Tamil Nadu PWD",
  "TANGEDCO",
  "TWAD Board",
  "Highways Department",
  "Chennai Corporation",
  "Rural Development Department",
];

const organizationTypes = [
  "Government Department",
  "Corporation",
  "Board",
  "Municipality",
  "Panchayat Union",
];

const tenderCategories = [
  "Construction",
  "Infrastructure",
  "Water Supply",
  "Electricity",
  "IT Services",
  "Agriculture",
];

const productCategories = [
  "Construction Materials",
  "Electrical Equipment",
  "Pipes and Fittings",
  "Software Solutions",
  "Machinery",
  "Medical Equipment",
];

const expiryOptions = ["Open", "Closing Soon", "Expired"];

const districts = ["Chennai", "Coimbatore", "Salem", "Madurai", "Tiruchirappalli", "Erode"];

export default function OrganizationSearchCard({ filters, onFilterChange, onSearch, onReset }) {
  const handleChipClick = (org) => {
    onFilterChange({ ...filters, organization: org });
  };

  const handleSelect = (field) => (e) => {
    onFilterChange({ ...filters, [field]: e.target.value });
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5 sm:p-6">
      {/* Search row */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block">
          Search Organization
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={filters.organization}
              onChange={(e) => onFilterChange({ ...filters, organization: e.target.value })}
              placeholder="Enter organization name"
              className="w-full pl-10 pr-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-govblue-400 focus:border-govblue-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSearch}
              className="flex items-center gap-2 bg-govblue-700 hover:bg-govblue-800 text-white font-semibold text-sm px-5 py-2.5 rounded-md transition-colors"
            >
              <Search size={16} />
              Search
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-2 border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold text-sm px-4 py-2.5 rounded-md transition-colors"
            >
              <RotateCcw size={15} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Popular organization chips */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
          Popular Organizations
        </p>
        <div className="flex flex-wrap gap-2">
          {popularOrganizations.map((org) => (
            <button
              key={org}
              onClick={() => handleChipClick(org)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filters.organization === org
                  ? "bg-govblue-700 text-white border-govblue-700"
                  : "bg-govblue-50 text-govblue-700 border-govblue-200 hover:bg-govblue-100"
              }`}
            >
              {org}
            </button>
          ))}
        </div>
      </div>

      {/* Filters grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <FilterSelect
          label="Organization Type"
          value={filters.organizationType}
          onChange={handleSelect("organizationType")}
          options={organizationTypes}
        />
        <FilterSelect
          label="Tender Category"
          value={filters.tenderCategory}
          onChange={handleSelect("tenderCategory")}
          options={tenderCategories}
        />
        <FilterSelect
          label="Product Category"
          value={filters.productCategory}
          onChange={handleSelect("productCategory")}
          options={productCategories}
        />
        <FilterSelect
          label="Tender Expire"
          value={filters.expiry}
          onChange={handleSelect("expiry")}
          options={expiryOptions}
        />
        <FilterSelect
          label="District"
          value={filters.district}
          onChange={handleSelect("district")}
          options={districts}
        />
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-govblue-400 focus:border-govblue-400"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
