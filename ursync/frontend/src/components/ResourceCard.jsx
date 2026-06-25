import React from "react";
import { FaFilePdf, FaBook, FaFileContract, FaQuestionCircle, FaDownload } from "react-icons/fa";

const iconMap = {
  pdf: FaFilePdf,
  book: FaBook,
  guideline: FaFileContract,
  faq: FaQuestionCircle,
};

const ResourceCard = ({ resource }) => {
  const Icon = iconMap[resource.icon] || FaFilePdf;

  return (
    <div className="bg-white rounded-2xl border border-cardBorder shadow-card p-4 flex items-center gap-3.5 hover:shadow-lg hover:-translate-y-0.5 transition-smooth">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${resource.color}1A`, color: resource.color }}
      >
        <Icon />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-heading font-semibold text-navy text-sm leading-snug">
          {resource.title}
        </h4>
        <p className="font-body text-xs text-[#888] mt-0.5 leading-snug">
          {resource.description}
        </p>
      </div>
      <button
        className="text-navy text-base shrink-0 hover:text-orange transition-smooth"
        aria-label={`Download ${resource.title}`}
      >
        <FaDownload />
      </button>
    </div>
  );
};

export default ResourceCard;
