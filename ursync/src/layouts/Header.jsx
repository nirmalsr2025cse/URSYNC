import React from "react";
import { LogIn, Landmark } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-govblue-800 text-white shadow-md border-b-4 border-govgold-400">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-[1600px] mx-auto">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full p-2 shadow-sm flex items-center justify-center">
            <Landmark className="text-govblue-700" size={26} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight tracking-wide">
              Urban Rural Sync
            </h1>
            <p className="text-[11px] sm:text-xs text-govblue-100 leading-tight">
              Tender Dashboard &mdash; Government of Tamil Nadu
            </p>
          </div>
        </div>

        {/* Right section: role + login */}
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden sm:inline text-xs bg-govblue-700/60 px-3 py-1 rounded-full border border-govblue-600">
            Role: Public User
          </span>
          <button className="flex items-center gap-2 bg-govgold-400 hover:bg-govgold-500 text-govblue-900 font-semibold text-sm px-4 py-2 rounded-md transition-colors shadow-sm">
            <LogIn size={16} />
            Login
          </button>
        </div>
      </div>
    </header>
  );
}
