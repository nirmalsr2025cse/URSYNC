import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import RoleSwitcher from './RoleSwitcher'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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