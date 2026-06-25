import React from "react";
import {
  FaFileExcel,
  FaFilePdf,
  FaFileAlt,
  FaShieldAlt,
  FaCogs,
  FaFirefox,
  FaDraftingCompass,
  FaWpforms,
  FaGavel,
  FaDownload,
} from "react-icons/fa";

const iconMap = {
  spreadsheet: FaFileExcel,
  pdf: FaFilePdf,
  template: FaFileAlt,
  manual: FaFileAlt,
  shield: FaShieldAlt,
  settings: FaCogs,
  browser: FaFirefox,
  dwg: FaDraftingCompass,
  form: FaWpforms,
  auction: FaGavel,
};

const DownloadCard = ({ item, view = "grid" }) => {
  const Icon = iconMap[item.icon] || FaFileAlt;

  if (view === "list") {
    return (
      <div className="bg-white rounded-2xl border border-cardBorder shadow-card p-4 sm:p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-smooth">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${item.color}1A`, color: item.color }}
        >
          <Icon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-semibold text-navy text-sm sm:text-base">
              {item.title}
            </h3>
            <span className="text-[10px] sm:text-xs font-body font-medium bg-filterBg text-filterText px-2 py-0.5 rounded-full">
              {item.category}
            </span>
          </div>
          <p className="font-body text-xs sm:text-sm text-[#777] mt-1">
            {item.description}
          </p>
        </div>
        <button className="flex items-center gap-1.5 bg-navy text-white text-xs sm:text-sm font-body font-medium px-3 sm:px-4 py-2 rounded-lg hover:bg-[#0c3c68] transition-smooth shrink-0">
          <FaDownload className="text-xs" />
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-cardBorder shadow-card p-5 flex flex-col hover:shadow-lg hover:-translate-y-1 transition-smooth">
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: `${item.color}1A`, color: item.color }}
        >
          <Icon />
        </div>
        <span className="text-[11px] font-body font-medium bg-filterBg text-filterText px-2.5 py-1 rounded-full">
          {item.category}
        </span>
      </div>

      <h3 className="font-heading font-semibold text-navy text-base mb-1.5 leading-snug">
        {item.title}
      </h3>
      <p className="font-body text-sm text-[#777] flex-1 leading-relaxed">
        {item.description}
      </p>

      <button className="mt-4 flex items-center gap-2 text-navy font-body font-semibold text-sm hover:gap-3 transition-smooth self-start group">
        <FaDownload className="text-sm" />
        <span className="border-b border-transparent group-hover:border-navy">
          Download
        </span>
      </button>
    </div>
  );
};

export default DownloadCard;
