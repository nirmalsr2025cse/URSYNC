// src/components/dashboard/TabBar.jsx
// Shared sub-tab pill bar for the Tender Analysis metric pages. Style is
// the one introduced in NumberValueWiseAnalysis.jsx (solid navy pills,
// red pill for the active tab) — NumberWiseAnalysis and ValueWiseAnalysis
// now use this too instead of each keeping their own copy.
import React from 'react'
import Icon from '../Icon'

export default function TabBar({ tabs, activeTab, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'flex items-center justify-center sm:inline-flex sm:justify-start w-full sm:w-auto',
              'px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm',
              isActive ? 'bg-red-500 text-white' : 'bg-tn-navy text-white hover:bg-tn-navy/90',
            ].join(' ')}
          >
            {tab.icon && <Icon name={tab.icon} className="w-3 h-3 mr-1 flex-shrink-0" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}