// src/routes/PublicRoute.jsx
//
// Wrap /login (and /forgot-password) with this. If the user is ALREADY
// authenticated and manually types /login in the address bar, send them
// to /home instead of showing the login form again. This is the other
// half of the fix — without it, some apps have logic that "helpfully"
// redirects an authenticated user away from /login, which combined with
// a misconfigured ProtectedRoute is what causes the home->login->home
// bounce you saw.

import { Navigate } from 'react-router-dom'

export default function PublicRoute({ children }) {
  const token = localStorage.getItem('token')

  if (token) {
    return <Navigate to="/home" replace />
  }

  return children
}