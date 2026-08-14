// src/data/approvementConstants.js

const past = (d) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString().split('T')[0] }
const future = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0] }

export const TENDER_APPROVAL_STATUS_CONFIG = {
  'Pending Approval':      { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  'Sent to Administrator': { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-300',  dot: 'bg-purple-500'  },
  'Approved':              { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Rejected':              { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
  'Draft':                 { bg: 'bg-gray-100',   text: 'text-gray-700',    border: 'border-gray-200',    dot: 'bg-gray-400'    },
}

export const BIDDER_APPROVAL_STATUS_CONFIG = {
  'Pending':  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  'Approved': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Rejected': { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
}

export const PRIORITY_CONFIG = {
  'Low':      { bg: 'bg-gray-100',  text: 'text-gray-600'  },
  'Medium':   { bg: 'bg-blue-50',   text: 'text-blue-600'  },
  'High':     { bg: 'bg-amber-50',  text: 'text-amber-700' },
  'Critical': { bg: 'bg-red-50',    text: 'text-red-700'   },
}

export const APPROVAL_TENDER_CATEGORIES = [
  'Construction', 'Infrastructure', 'Roads', 'Water Supply',
  'Drainage', 'School Building', 'Hospital Building',
  'Software Development', 'Equipment Procurement', 'Energy', 'Other',
]

export const APPROVAL_BIDDER_STATUSES = ['All', 'Pending', 'Approved', 'Rejected', 'On Hold']
export const APPROVAL_TENDER_STATUSES = ['All', 'Pending Approval', 'Sent to Administrator', 'Approved', 'Rejected', 'Draft']
