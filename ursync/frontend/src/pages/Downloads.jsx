import React, { useState, useMemo } from "react";
import { MdFileDownload, MdSearch, MdRefresh, MdMenu } from "react-icons/md";
import DownloadCard from "../components/DownloadCard";
import ResourceCard from "../components/ResourceCard";
import { downloadsData, resourcesData, categories } from "../data/downloads";

// ─── Inline SearchBox ────────────────────────────────────────────────────────
// Now a live/auto search — every keystroke filters immediately.
// The Search button is gone; "Clear all" appears only when there's text.
const SearchBox = ({ searchTerm, setSearchTerm, onReset }) => {
  const isEmpty = searchTerm.trim() === "";

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="bg-white border-tn-gold rounded-2xl border border-cardBorder shadow-card p-5 sm:p-6">
      <label
        htmlFor="search-downloads"
        className="block font-heading font-semibold text-navy text-base sm:text-lg mb-3"
      >
        Search Downloads
      </label>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A8A8] text-xl" />
          <input
            id="search-downloads"
            type="text"
            value={searchTerm}
            onChange={handleChange}
            placeholder="Search software, forms, manuals..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all mt-0.5"
          />
        </div>

        {/* Clear all — only rendered once the user has typed something */}
        {!isEmpty && (
          <div className="flex gap-3 shrink-0 self-center sm:self-auto">
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-tn-muted underline ml-1 shrink-0 self-center"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Downloads Page ──────────────────────────────────────────────────────────
const Downloads = ({ onMenuClick }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [view, setView] = useState("grid");

  const handleReset = () => {
    setSearchTerm("");
    setActiveCategory("All");
  };

  const filteredDownloads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return downloadsData.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const matchesSearch =
        term === "" ||
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Downloads
          </h1>
          <p className="text-sm text-tn-muted mt-0.5 max-w-2xl">
            Access required software, templates, and documents for smooth tender participation.
          </p>
        </div>

        <nav className="text-xs text-tn-muted flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Downloads</span>
        </nav>
      </div>

      {/* Search + Filters */}
      <div className="mt-6">
        <SearchBox
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onReset={handleReset}
        />
        <div className="flex overflow-x-auto gap-2.5 mt-4">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors font-medium mb-2 shrink-0
                  ${
                    isActive
                      ? "bg-[#1B3D6E] text-white border-[#1B3D6E]"
                      : "bg-tn-light text-[#1B3D6E] border-tn-border hover:bg-[#1B3D6E] hover:text-white"
                  }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Downloads Grid / List */}
      <div className="flex items-center justify-between mt-9 mb-4">
        <h2 className="flex items-center gap-2 font-heading font-semibold text-navy text-xl sm:text-2xl">
          <MdFileDownload className="text-orange text-2xl" />
          Available Downloads
        </h2>

        <div className="flex bg-white border border-[#FFE5BF] rounded-xl p-1 shadow-sm self-start">
          <button
            onClick={() => setView("grid")}
            className={`p-2 rounded-lg transition-colors ${
              view === "grid" ? 'bg-tn-navy text-white' : 'text-gray-400 hover:text-tn-navy'
            }`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 rounded-lg transition-colors ${
              view === "list" ? 'bg-tn-navy text-white' : 'text-gray-400 hover:text-tn-navy'
            }`}
            aria-label="List view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {filteredDownloads.length > 0 ? (
        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5"
              : "flex flex-col gap-3"
          }
        >
          {filteredDownloads.map((item) => (
            <DownloadCard key={item.id} item={item} view={view} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-cardBorder p-10 text-center text-[#888] font-body">
          No downloads match your search. Try a different keyword or category.
        </div>
      )}

      {/* Important Resources */}
      <div className="mt-10">
        <h2 className="flex items-center gap-2 font-heading font-semibold text-navy text-xl sm:text-2xl mb-4">
          <MdFileDownload className="text-orange text-2xl" />
          Important Resources
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {resourcesData.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Downloads;