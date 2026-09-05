import React from 'react'
import { Navigate } from 'react-router-dom'
import { useRole, ROLES } from '../components/RoleContext'

export default function PublicRoute({ children }) {
  const { role, loading } = useRole()
  const token = localStorage.getItem('token')

  // If already authenticated, redirect to /home so they cannot access login/signup again
  if (!loading && token && role !== ROLES.PUBLIC) {
    return <Navigate to="/home" replace />
  }

  return children
}