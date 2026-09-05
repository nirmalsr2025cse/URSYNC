// src/routes/RoleRoute.jsx
import React from 'react'
import { useRole } from '../components/RoleContext'
import NotFound from '../pages/NotFound'

/**
 * RoleRoute checks if the active user role is authorized for the route.
 * If the active role is not in allowedRoles, it renders the 404 NotFound
 * page so unauthorized users are shown that the page does not exist.
 */
export default function RoleRoute({ allowedRoles, children }) {
  const { role, loading } = useRole()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      return <NotFound />
    }
  }

  return children
}
