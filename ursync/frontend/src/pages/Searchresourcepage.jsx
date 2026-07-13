//SEARCH RESOURSE PAGE


import React, { useState, useMemo } from "react";
import { Search, MapPin, Tag, CheckCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RESOURCES from "../data/resourceData.js";

export default function SearchResourcePage() {
  const navigate   = useNavigate();
  const [query,    setQuery]    = useState("");
  const [searched, setSearched] = useState(false);
  const [applied,  setApplied]  = useState("");

  const results = useMemo(() => {
    if (!applied.trim()) return [];
    const q = applied.toLowerCase();
    return RESOURCES.filter(r =>
      r.available && (                      // ← hide unavailable resources entirely
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q)
      )
    );
  }, [applied]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setApplied(query);
    setSearched(true);
  };

  // Chip only fills the input — user must press Search or Enter to see results
  const handleChip = (chip) => {
    setQuery(chip);
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-tn-muted mb-3">
        <span>Home</span><ChevronRight size={12}/><span className="text-tn-blue font-semibold">Search Resource</span>
      </div>

      <h1 className="text-2xl font-bold text-tn-navy mb-1">Search Resource</h1>
      <p className="text-sm text-tn-muted mb-8">Search for available government construction resources such as JCB, crane, bulldozer and more.</p>

      {/* Search card — full width */}
      <div className="bg-white rounded-2xl border border-tn-border shadow-sm p-6 mb-8 w-full">
        <label className="block text-sm font-semibold text-tn-navy mb-3">What resource are you looking for?</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tn-muted"/>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="e.g. JCB, crane, bulldozer, water tanker..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-tn-border text-sm text-tn-navy placeholder-tn-muted focus:outline-none focus:ring-2 focus:ring-tn-blue/40"
            />
          </div>

          {/* Search button — blurred and disabled until user types */}
          <button
            onClick={handleSearch}
            disabled={!query.trim()}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200
              ${query.trim()
                ? "bg-tn-blue hover:bg-tn-navy text-white shadow-md hover:shadow-lg active:scale-95"
                : "bg-tn-blue text-white cursor-not-allowed opacity-30 blur-[1px] pointer-events-none select-none"
              }`}
          >
            <Search size={16}/> Search
          </button>
        </div>

        {/* Popular chips */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-tn-muted font-medium">Popular:</span>
          {["JCB","Crane","Bulldozer","Water Tanker","Tipper","Generator","Roller","Paver"].map(s => (
            <button key={s} onClick={() => handleChip(s)}
              className="text-xs px-3 py-1 rounded-full bg-tn-light border border-tn-border text-tn-navy hover:bg-tn-gold transition-colors">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div>
          <h2 className="text-base font-bold text-tn-navy mb-5">
            {results.length > 0
              ? `${results.length} resource${results.length === 1 ? "" : "s"} found for "${applied}"`
              : `No resources found for "${applied}"`}
          </h2>

          {results.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-tn-light border border-tn-border flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-tn-muted"/>
              </div>
              <p className="text-tn-navy font-semibold">No resources found</p>
              <p className="text-sm text-tn-muted mt-1">Try a different keyword like "JCB", "crane" or "mixer".</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {results.map(res => (
              <ResourceCard
                key={res.id}
                resource={res}
                onCardClick={() => navigate("/search-resource/details", { state: { resource: res } })}
                onGetResource={() => navigate("/search-resource/get-resource", { state: { resource: res } })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Initial empty state */}
      {!searched && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-tn-light border border-tn-border flex items-center justify-center mx-auto mb-5">
            <Search size={36} className="text-tn-muted"/>
          </div>
          <p className="text-tn-navy font-bold text-lg">Search for a Resource</p>
          <p className="text-sm text-tn-muted mt-2 max-w-md mx-auto">Enter a resource name above to browse available government construction equipment across Tamil Nadu.</p>
        </div>
      )}
    </div>
  );
}

// ─── Resource Card (only shown for available resources) ───────────────────────
function ResourceCard({ resource, onCardClick, onGetResource }) {
  return (
    <div onClick={onCardClick} className="bg-white rounded-2xl border border-tn-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col">
      {/* Image */}
      <div className="h-44 w-full overflow-hidden bg-tn-light relative">
        <img src={resource.image} alt={resource.name} className="w-full h-full object-cover"/>
        {/* Always Available badge since we filter out unavailable */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow bg-green-100 text-green-700">
          <CheckCircle size={12}/> Available
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-bold text-tn-navy">{resource.name}</h3>
        <p className="text-xs text-tn-muted mt-0.5">{resource.specs}</p>

        <div className="mt-3 space-y-1.5 text-xs text-tn-muted">
          <div className="flex items-center gap-1.5"><Tag size={12}/><span>{resource.category}</span></div>
          <div className="flex items-center gap-1.5"><MapPin size={12}/><span>{resource.district}</span></div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-tn-navy">₹{resource.dailyRate.toLocaleString("en-IN")}</span>
            <span className="text-tn-muted">/ day</span>
          </div>
          <p className="text-green-600 font-semibold">
            {resource.quantity} unit{resource.quantity > 1 ? "s" : ""} available
          </p>
        </div>

        {/* GET RESOURCE — always active since cards are only shown for available resources */}
        <button
          onClick={e => { e.stopPropagation(); onGetResource(); }}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold bg-tn-blue hover:bg-tn-navy text-white shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
        >
          GET RESOURCE
        </button>
      </div>
    </div>
  );
}