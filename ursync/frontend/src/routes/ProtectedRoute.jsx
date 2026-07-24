// src/routes/ProtectedRoute.jsx
//
// Wrap any route that requires login. If there's no valid token, the
// user is sent to /login and STAYS there — no bounce back to /home,
// because /home is never rendered in the first place.

import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  const location = useLocation()

  if (!token) {
    // `replace` avoids adding a history entry, so the back button
    // doesn't bounce the user between /login and /home either.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}