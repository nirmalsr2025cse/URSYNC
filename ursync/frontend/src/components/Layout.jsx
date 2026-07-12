// src/components/Layout.jsx
import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import RoleSwitcher from './RoleSwitcher'

// The Dashboard module has its own DashboardSidebar (see
// src/pages/Dashboard.jsx) instead of the app's existing Sidebar, and no
// RoleSwitcher "Preview as" bar — but the main Navbar (and its hamburger
// button) stays constant everywhere. On the Dashboard route, that same
// hamburger is wired to open/close DashboardSidebar instead of the
// existing Sidebar, via Outlet context — no second hamburger needed on
// the page itself.
// Update DASHBOARD_ROOT if the Dashboard route ends up living at a
// different path than /dashboard.
const DASHBOARD_ROOT = '/dashboard'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const isDashboardRoute = location.pathname.startsWith(DASHBOARD_ROOT)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />

      {isDashboardRoute ? (
        // Dashboard.jsx owns everything below the Navbar. The Navbar's
        // hamburger still controls sidebarOpen — Dashboard just reads it
        // via useOutletContext() and applies it to DashboardSidebar.
        <div className="flex-1 overflow-hidden">
          <Outlet context={{ sidebarOpen, closeSidebar: () => setSidebarOpen(false) }} />
        </div>
      ) : (
        <>
          <RoleSwitcher />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
            <main className="flex-1 overflow-y-auto bg-tn-cream">
              <Outlet />
            </main>
          </div>
        </>
      )}
    </div>
  )
}