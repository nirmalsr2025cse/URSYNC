import React, { createContext, useContext, useState } from 'react'

// ── All available roles ───────────────────────────────────────────────────────
export const ROLES = {
  PUBLIC:              'public',
  DEPARTMENT_EMPLOYEE: 'department_employee',
  DEPARTMENT_HEAD:     'department_head',
  ADMINISTRATOR:       'administrator',
  FINANCIAL:           'financial',
  TENDER_AUTHORITY:    'tender_authority',
}

export const ROLE_LABELS = {
  [ROLES.PUBLIC]:              'Public User',
  [ROLES.DEPARTMENT_EMPLOYEE]: 'Department Employee',
  [ROLES.DEPARTMENT_HEAD]:     'Department Head',
  [ROLES.ADMINISTRATOR]:       'Administrator',
  [ROLES.FINANCIAL]:           'Financial Department',
  [ROLES.TENDER_AUTHORITY]:    'Tender Authority',
}

export const ROLE_COLORS = {
  [ROLES.PUBLIC]:              'bg-gray-100 text-gray-700',
  [ROLES.DEPARTMENT_EMPLOYEE]: 'bg-blue-100 text-blue-700',
  [ROLES.DEPARTMENT_HEAD]:     'bg-purple-100 text-purple-700',
  [ROLES.ADMINISTRATOR]:       'bg-red-100 text-red-700',
  [ROLES.FINANCIAL]:           'bg-green-100 text-green-700',
  [ROLES.TENDER_AUTHORITY]:    'bg-amber-100 text-amber-700',
}

// ── Nav items per role ────────────────────────────────────────────────────────
export const NAV_CONFIG = {
  [ROLES.PUBLIC]: [
    { label: 'Home',                      path: '/home',                icon: 'home' },
    { label: 'TN Tenders Act',            path: '/tn-tenders-act',      icon: 'doc' },
    { label: 'Dashboard',                 path: '/dashboard',           icon: 'dash' },
    { label: 'Tenders by Location',       path: '/tenders-by-location', icon: 'mappin' },
    { label: 'Tenders by Organisation',   path: '/tenders-by-org',      icon: 'building' },
    { label: 'Tenders by Classification', path: '/tenders-by-class',    icon: 'tag' },
    { label: 'Tenders in Archive',        path: '/archive',             icon: 'archive' },
    { label: 'Tender Status',             path: '/tender-status',       icon: 'status' },
    { label: 'Cancelled / Retendered',    path: '/cancelled',           icon: 'cancel' },
    { label: 'Downloads',                 path: '/downloads',           icon: 'download' },
    { label: 'Debarment List',            path: '/debarment',           icon: 'shield' },
    { label: 'Announcements',             path: '/announcements',       icon: 'bell' },
    { label: 'Tender Cum Auction',        path: '/auction',             icon: 'gavel' },
  ],

  [ROLES.DEPARTMENT_EMPLOYEE]: [
    { label: 'Home',                   path: '/home',              icon: 'home' },
    { label: 'Dashboard',              path: '/dashboard',         icon: 'dash' },
    { label: 'Tender Details',         path: '/tender-details',    icon: 'doc' },
    { label: 'Reports & Feedbacks',    path: '/reports',           icon: 'chart' },
    { label: 'Cancelled / Retendered', path: '/cancelled',         icon: 'cancel' },
    { label: 'Check Tender Status',    path: '/tender-status',     icon: 'status' },
    { label: 'Bidder Selection',       path: '/bidder-selection',  icon: 'users' },
  ],

  [ROLES.DEPARTMENT_HEAD]: [
    { label: 'Home',                   path: '/home',              icon: 'home' },
    { label: 'Dashboard',              path: '/dashboard',         icon: 'dash' },
    { label: 'Tender Details',         path: '/tender-details',    icon: 'doc' },
    { label: 'Reports & Feedbacks',    path: '/reports',           icon: 'chart' },
    { label: 'Conflicts',              path: '/conflicts',         icon: 'conflict' },
    { label: 'Pending',                path: '/pending',           icon: 'pending' },
    { label: 'Resource Sharing',       path: '/resource-sharing',  icon: 'share' },
    { label: 'Cancelled / Retendered', path: '/cancelled',         icon: 'cancel' },
    { label: 'Check Tender Status',    path: '/tender-status',     icon: 'status' },
    { label: 'Bidder Selection',       path: '/bidder-selection',  icon: 'users' },
  ],

  [ROLES.ADMINISTRATOR]: [
    { label: 'Home',                   path: '/home',              icon: 'home' },
    { label: 'Dashboard',              path: '/dashboard',         icon: 'dash' },
    { label: 'Reports & Feedbacks',    path: '/reports',           icon: 'chart' },
    { label: 'Conflicts',              path: '/conflicts',         icon: 'conflict' },
    { label: 'Pending',                path: '/pending',           icon: 'pending' },
    { label: 'Retenders',              path: '/retenders',         icon: 'retender' },
    { label: 'Check Tender Status',    path: '/tender-status',     icon: 'status' },
    { label: 'Bidder List',            path: '/bidder-list',       icon: 'users' },
    { label: 'Cancelled',              path: '/cancelled',         icon: 'cancel' },
  ],

  [ROLES.FINANCIAL]: [
    { label: 'Home', path: '/home', icon: 'home' },
    { label: 'Pending Approvals', path: '/pending', icon: 'pending' },
    { label: 'Approved', path: '/approved', icon: 'completed' },
    { label: 'Rejected', path: '/rejected', icon: 'cancel' },
    { label: 'Fund Allocation', path: '/fund-allocation', icon: 'money' },
    { label: 'Financial Changes', path: '/financial-changes', icon: 'edit' },
    { label: 'Retenders',    path: '/retenders',    icon: 'retender' },
    { label: 'Cancelled',    path: '/cancelled',    icon: 'cancel' },
  ],

  [ROLES.TENDER_AUTHORITY]: [
    { label: 'Home',         path: '/home',         icon: 'home' },
    { label: 'Applications', path: '/applications', icon: 'applications' },
    { label: 'Pending',      path: '/pending',      icon: 'pending' },
    { label: 'Retenders',    path: '/retenders',    icon: 'retender' },
    { label: 'Approved',     path: '/approved',     icon: 'completed' },
    { label: 'Cancelled',    path: '/cancelled',    icon: 'cancel' },
  ],
}

// ── Context ───────────────────────────────────────────────────────────────────
const RoleContext = createContext(null)

export function RoleProvider({ children }) {
  const [role, setRole] = useState(ROLES.PUBLIC)

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside RoleProvider')
  return ctx
}