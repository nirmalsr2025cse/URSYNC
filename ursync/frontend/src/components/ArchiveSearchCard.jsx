import React from "react";
import { Search, RotateCcw, Hash } from "lucide-react";

export default function ArchiveSearchCard({
  tenderId,
  onTenderIdChange,
  onTenderIdSearch,
  onReset,
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && tenderId.trim().length > 0) onTenderIdSearch();
  };

  const [searchBox, setSearchBox] = React.useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-tn-gold p-5 sm:p-6">
      {/* Search by Tender ID — only search on this page, no captcha */}
      <div>
        <label className="text-sm font-semibold text-rust-900 mb-2 block">
          Search by Tender ID
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Hash
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-rust-400"
            />
            <input
              type="text"
              value={tenderId}
              onChange={(e) =>{ 
                onTenderIdChange(e.target.value)
                setSearchBox(e.target.value.length > 0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. TN/PWD/2025/014"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onTenderIdSearch}
              disabled={tenderId.trim().length === 0}
              className="flex items-center gap-2 bg-tn-blue hover:bg-rust-600 text-white font-semibold text-sm px-5 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search size={16} />
              Search
            </button>
            {searchBox &&
              <button
                onClick={onReset}
                className="text-xs text-tn-muted  underline ml-1"
              >
                Clear All
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
