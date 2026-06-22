import React from "react";

export default function PlaceholderPage({ title }) {
  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow-card border border-govblue-100 p-10 text-center max-w-2xl mx-auto mt-10">
        <h2 className="text-xl font-bold text-govblue-800 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm">
          This section is not part of the current build. Select{" "}
          <span className="font-semibold text-govblue-700">"Tenders by Organization"</span> from
          the sidebar to view the live page.
        </p>
      </div>
    </div>
  );
}
