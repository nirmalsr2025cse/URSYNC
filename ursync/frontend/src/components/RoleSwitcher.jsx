import React from 'react'
import { useRole, ROLE_LABELS, ROLE_COLORS } from './RoleContext'

export default function RoleSwitcher() {
  const { role, setRole } = useRole()

  return (
    <div className="bg-white border-b border-tn-border px-4 py-2
                    flex items-center gap-2 flex-wrap flex-shrink-0">
      <span className="text-xs font-semibold text-tn-muted mr-1">Preview as:</span>
      {Object.entries(ROLE_LABELS).map(([roleKey, label]) => (
        <button
          key={roleKey}
          onClick={() => setRole(roleKey)}
          className={[
            'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
            role === roleKey
              ? ROLE_COLORS[roleKey] + ' border-current scale-105 shadow-sm'
              : 'bg-tn-light text-tn-muted border-tn-border hover:border-tn-blue hover:text-tn-blue',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}