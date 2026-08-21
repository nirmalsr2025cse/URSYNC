import React, { createContext, useContext, useState } from 'react'

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
    { label: 'Cancelled / Retendered', path: '/cancelled',        icon: 'retender' },
    { label: 'Check Tender Status',    path: '/tender-status',    icon: 'status'   },
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
    { label: 'Completed',                path: '/completed',         icon: 'completed'    },
    { label: 'Cancelled / Retendered',   path: '/cancelled',         icon: 'retender'},
    { label: 'Tender Financial Changes', path: '/financial-changes', icon: 'finance' },
    { label: 'Approved',               path: '/approved', icon: 'users'    },
  ],

  [ROLES.TENDER_AUTHORITY]: [
    { label: 'Home',         path: '/home',         icon: 'home'         },
    { label: 'Pending',      path: '/pending',      icon: 'pending'      },
    { label: 'Completed',    path: '/completed',    icon: 'completed'    },
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
    { label: 'Tender Cum Auction', path: '/auction',             icon: 'gavel'        },
  ],
}

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