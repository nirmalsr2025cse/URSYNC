import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  ScrollText,
  LayoutDashboard,
  MapPin,
  Building2,
  Tags,
  Archive,
  ListChecks,
  Download,
  ListTree,
  Megaphone,
} from "lucide-react";

const navItems = [
  { label: "Home", icon: Home, path: "/" },
  { label: "TN Tenders Act", icon: ScrollText, path: "/tn-tenders-act" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tenders by Location", icon: MapPin, path: "/tenders-by-location" },
  { label: "Tenders by Organization", icon: Building2, path: "/tenders-by-organization" },
  { label: "Tenders by Classification", icon: Tags, path: "/tenders-by-classification" },
  { label: "Tenders in Archive", icon: Archive, path: "/tenders-archive" },
  { label: "Tender Status", icon: ListChecks, path: "/tender-status" },
  { label: "Downloads", icon: Download, path: "/downloads" },
  { label: "Department List", icon: ListTree, path: "/department-list" },
  { label: "Announcements", icon: Megaphone, path: "/announcements" },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-govblue-100 shadow-sm min-h-[calc(100vh-64px)]">
      <nav className="py-4">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ label, icon: Icon, path }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm font-medium border-l-4 transition-colors ${
                    isActive
                      ? "bg-govblue-50 border-govblue-600 text-govblue-800"
                      : "border-transparent text-slate-600 hover:bg-govblue-50/60 hover:text-govblue-700"
                  }`
                }
                end={path === "/"}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
