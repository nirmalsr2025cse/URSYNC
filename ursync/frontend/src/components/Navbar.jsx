import React, { useState, useRef, useEffect } from 'react'
import { useRole, ROLES, ROLE_LABELS, ROLE_COLORS } from './RoleContext'

export default function Navbar({ onToggleSidebar }) {
  const { role, setRole } = useRole()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isLoggedIn = role !== ROLES.PUBLIC

  return (
    <header className="sticky top-0 z-40 bg-tn-navy shadow-md">
      <div className="flex items-center h-16 px-4 gap-3">

        {/* Hamburger — mobile/tablet only */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg
                     text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-tn-gold
                          flex items-center justify-center font-display font-bold
                          text-tn-navy text-sm select-none">
            TN
          </div>
          <div className="min-w-0">
            <p className="text-white font-display font-bold text-sm leading-tight truncate">
              Tamil Nadu Government
            </p>
            <p className="text-white/90 text-xs leading-tight font-medium truncate">
              Tenders & Department Collaboration Portal
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">

          {/* Phone */}
          <a
            href="tel:18004251234"
            className="hidden sm:flex items-center gap-1.5 text-white/70 hover:text-white
                       text-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L8.5 10.5a11.049 11.049 0 005 5l1.113-1.724a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 15.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            1800-425-1234
          </a>

          {/* Role switcher / Login button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg
                         text-xs font-semibold hover:bg-white/10 transition-colors
                         border border-white/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:inline">
                {isLoggedIn ? ROLE_LABELS[role] : 'Login'}
              </span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl
                              border border-tn-border shadow-xl z-50 overflow-hidden
                              animate-fade-in">

                {/* Header */}
                <div className="px-3 py-2 bg-tn-light border-b border-tn-border">
                  <p className="text-xs font-semibold text-tn-navy">Switch Role</p>
                  <p className="text-[10px] text-tn-muted">Select to preview different access</p>
                </div>

                {/* Role options */}
                <div className="py-1">
                  {Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => (
                    <button
                      key={roleKey}
                      onClick={() => {
                        setRole(roleKey)
                        setDropdownOpen(false)
                      }}
                      className={[
                        'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left',
                        'hover:bg-tn-light transition-colors',
                        role === roleKey ? 'bg-tn-light font-semibold' : 'font-medium text-tn-navy',
                      ].join(' ')}
                    >
                      {/* Active indicator */}
                      <span className={[
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        role === roleKey ? 'bg-tn-blue' : 'bg-transparent',
                      ].join(' ')} />

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLORS[roleKey]}`}>
                        {roleLabel}
                      </span>

                      {role === roleKey && (
                        <svg className="w-3 h-3 text-tn-blue ml-auto flex-shrink-0"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                {/* Logout — only if not public */}
                {isLoggedIn && (
                  <div className="border-t border-tn-border py-1">
                    <button
                      onClick={() => {
                        setRole(ROLES.PUBLIC)
                        setDropdownOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs
                                 text-tn-danger hover:bg-red-50 transition-colors font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gold accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-[#FFE5BF] via-[#FFF2DB] to-[#FFE5BF]" />
    </header>
  )
}