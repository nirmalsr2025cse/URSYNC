// src/components/Layout.jsx
import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import RoleSwitcher from './RoleSwitcher'

// The Dashboard module renders its own full-page top nav + DashboardSidebar
// (see src/pages/Dashboard.jsx), so Layout steps aside entirely for that
// route instead of stacking the existing Navbar/RoleSwitcher/Sidebar on top
// of it. Update DASHBOARD_ROOT if the Dashboard route ends up living at a
// different path than /dashboard.
const DASHBOARD_ROOT = '/dashboard'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const isDashboardRoute = location.pathname.startsWith(DASHBOARD_ROOT)

  if (isDashboardRoute) {
    // Dashboard.jsx owns its own chrome — render it standalone, full screen.
    return <Outlet />
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
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
    </div>
  )
}