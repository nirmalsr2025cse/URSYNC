import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMeRequest } from '../api/authApi'

export const ROLES = {
  PUBLIC:              'public',
  DEPARTMENT_EMPLOYEE: 'department_employee',
  DEPARTMENT_HEAD:     'department_head',
  ADMINISTRATOR:       'administrator',
  FINANCIAL:           'financial',
  TENDER_AUTHORITY:    'tender_authority',
  TENDER_PERSON:       'tender_person',
}

export const ROLE_LABELS = {
  [ROLES.PUBLIC]:              'Public User', // [ROLES.PUBLIC] becomes "public"
  [ROLES.DEPARTMENT_EMPLOYEE]: 'Department Employee',
  [ROLES.DEPARTMENT_HEAD]:     'Department Head',
  [ROLES.ADMINISTRATOR]:       'Administrator',
  [ROLES.FINANCIAL]:           'Financial Department',
  [ROLES.TENDER_AUTHORITY]:    'Tender Authority',
  [ROLES.TENDER_PERSON]:       'Tender Person',
}

export const ROLE_COLORS = {
  [ROLES.PUBLIC]:              'bg-gray-100 text-gray-700',
  [ROLES.DEPARTMENT_EMPLOYEE]: 'bg-blue-100 text-blue-700',
  [ROLES.DEPARTMENT_HEAD]:     'bg-purple-100 text-purple-700',
  [ROLES.ADMINISTRATOR]:       'bg-red-100 text-red-700',
  [ROLES.FINANCIAL]:           'bg-green-100 text-green-700',
  [ROLES.TENDER_AUTHORITY]:    'bg-amber-100 text-amber-700',
  [ROLES.TENDER_PERSON]:       'bg-slate-100 text-teal-700',
}

export const NAV_CONFIG = {
  [ROLES.PUBLIC]: [
    { label: 'Home',                      path: '/home',                icon: 'home'     },
    { label: 'TN Tenders Act',            path: '/tn-tenders-act',      icon: 'doc'      },
    { label: 'Dashboard',                 path: '/dashboard/tender-analysis',           icon: 'dash'     },
    { label: 'Tenders by Location',       path: '/tenders-by-location', icon: 'mappin'   },
    { label: 'Tenders by Organisation',   path: '/tenders-by-org',      icon: 'building' },
    { label: 'Tenders by Classification', path: '/tenders-by-class',    icon: 'tag'      },
    { label: 'Tenders in Archive',        path: '/archive',             icon: 'archive'  },
    { label: 'Tender Status',             path: '/tender-status',       icon: 'status'   },
    { label: 'Cancelled / Retendered',    path: '/cancelled',           icon: 'retender' },
    { label: 'Downloads',                 path: '/downloads',           icon: 'download' },
    { label: 'Debarment List',            path: '/debarment',           icon: 'shield'   },
    { label: 'Announcements',             path: '/announcements',       icon: 'bell'     },
    { label: 'Tender Cum Auction',        path: '/auction',             icon: 'gavel'    },
  ],

  [ROLES.DEPARTMENT_EMPLOYEE]: [
    { label: 'Home',                   path: '/home',             icon: 'home'     },
    { label: 'Dashboard',              path: '/dashboard/tender-analysis',        icon: 'dash'     },
    { label: 'Saved & Create Tenders', path: '/create-saved-tenders',icon: 'doc'      },
    { label: 'Reports & Feedbacks',    path: '/reports',          icon: 'chart'    },
    { label: 'Cancelled / Retendered', path: '/cancelled',        icon: 'retender' },
    { label: 'Check Tender Status',    path: '/tender-status',    icon: 'status'   },
    { label: 'Approved',               path: '/approved', icon: 'users'    },
  ],

  [ROLES.DEPARTMENT_HEAD]: [
    { label: 'Home',                   path: '/home',             icon: 'home'     },
    { label: 'Dashboard',              path: '/dashboard/tender-analysis',        icon: 'dash'     },
    { label: 'Saved & Create Tenders', path: '/create-saved-tenders',   icon: 'doc'      },
    { label: 'Reports & Feedbacks',    path: '/reports',          icon: 'chart'    },
    { label: 'Conflicts',              path: '/conflicts',        icon: 'conflict' },
    { label: 'Resource Sharing',       path: '/resource-sharing', icon: 'share'    },
    { label: 'Add Resources', path: '/add-resources', icon: 'Boxes' },
    { label: 'Cancelled / Retendered', path: '/cancelled',        icon: 'retender' },
    { label: 'Check Tender Status',    path: '/tender-status',    icon: 'status'   },
    { label: 'Tender Financial Changes', path: '/review-financial-changes', icon: 'finance' },
    { label: 'Approved',               path: '/approved', icon: 'users'    },
    { label: 'Approvement',            path: '/approvement',      icon: 'approve'  },
  ],

  [ROLES.ADMINISTRATOR]: [
    { label: 'Home',                   path: '/home',           icon: 'home'     },
    { label: 'Dashboard',              path: '/dashboard/tender-analysis',      icon: 'dash'     },
    { label: 'Reports & Feedbacks',    path: '/reports',        icon: 'chart'    },
    { label: 'Conflicts',              path: '/conflicts',      icon: 'conflict' },
    { label: 'Cancelled / Retendered', path: '/cancelled',      icon: 'retender' },
    { label: 'Check Tender Status',    path: '/tender-status',  icon: 'status'   },
    { label: 'Approved',               path: '/approved',    icon: 'users'    },
    { label: 'Approvement',            path: '/approvement',    icon: 'approve'  },
  ],

  [ROLES.FINANCIAL]: [
    { label: 'Home',                     path: '/home',              icon: 'home'    },
    { label: 'Pending',                  path: '/pending',           icon: 'pending' },
    { label: 'Cancelled / Retendered',   path: '/cancelled',         icon: 'retender'},
    { label: 'Tender Financial Changes', path: '/financial-changes', icon: 'finance' },
    { label: 'Approved',               path: '/approved', icon: 'users'    },
  ],

  [ROLES.TENDER_AUTHORITY]: [
    { label: 'Home',         path: '/home',         icon: 'home'         },
    { label: 'Pending',      path: '/pending',      icon: 'pending'      },
    { label: 'Cancelled / Retendered',    path: '/cancelled',           icon: 'retender' },
    { label: 'Applications', path: '/applications', icon: 'applications' },
    { label: 'Approved',               path: '/approved', icon: 'users'    },
  ],

  [ROLES.TENDER_PERSON]: [
    { label: 'Home',               path: '/home',                icon: 'home'         },
    { label: 'Apply Tenders',      path: '/apply-tenders',       icon: 'apply'        },
    { label: 'Applied Tenders',    path: '/applied-tenders',     icon: 'savedtenders' },
    { label: 'Tender by Department',path: '/tenders-by-dept',    icon: 'building'     },
    { label: 'Tender by Location', path: '/tenders-by-location', icon: 'mappin'       },
    { label: 'Tender by Organization',path: '/tenders-by-org',   icon: 'org'          },
    { label: 'Tenders in Archive', path: '/archive',             icon: 'archive'      },
    { label: 'Your Tenders',       path: '/your-tenders',        icon: 'mytenders'    },
    { label: 'Cancelled Tenders',  path: '/cancelled',           icon: 'retender'     },
    { label: 'Search Resource',    path: '/search-resource',     icon: 'search'       },
    { label: 'Applied Resources',  path: '/applied-resources',   icon: 'clipboard'    },
    { label: 'Tender Cum Auction', path: '/auction',             icon: 'gavel'        },
  ],
}

const RoleContext = createContext(null)

export function RoleProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [role, setRoleState] = useState(() => {
    try {
      const token = localStorage.getItem('token')
      const stored = localStorage.getItem('user')
      if (token && stored) {
        const u = JSON.parse(stored)
        const userRole = u?.role || u?.roleName || u?.roleId?.name
        if (userRole && Object.values(ROLES).includes(userRole)) {
          return userRole
        }
      }
    } catch {}
    return ROLES.PUBLIC
  })

  const [loading, setLoading] = useState(true)

  // Fetch and verify authentic user & role from the backend
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setRoleState(ROLES.PUBLIC)
      setLoading(false)
      return
    }

    try {
      const res = await getMeRequest()
      if (res?.user && res?.role) {
        setUser(res.user)
        setRoleState(res.role)
        localStorage.setItem('user', JSON.stringify(res.user))
      }
    } catch (err) {
      console.warn('Could not verify backend session:', err.message)
      // If token is invalid / expired, purge session
      if (err.message?.includes('401') || err.message?.includes('Authentication')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
        setRoleState(ROLES.PUBLIC)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setRoleState(ROLES.PUBLIC)
    window.location.href = '/login'
  }, [])

  const setRole = useCallback((newRole) => {
    // Only allow setting valid role internally or during auth transitions
    setRoleState(newRole)
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        u.role = newRole
        localStorage.setItem('user', JSON.stringify(u))
      }
    } catch {}
  }, [])

  return (
    <RoleContext.Provider value={{ user, role, setRole, loading, logout, refreshUser }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside RoleProvider')
  return ctx
}