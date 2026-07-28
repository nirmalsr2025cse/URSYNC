// src/pages/LoginPage.jsx
//
// Mounts the Login component and wires its onSubmit prop to the real auth
// API. Login.jsx itself stays a pure, reusable presentational component
// with no networking logic.
import { useNavigate, useLocation } from 'react-router-dom'
import Login from './Login'

const BASE_URL = 'http://localhost:5000/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLoginSubmit({ identifier, password }) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      // Surfaces in Login.jsx's existing formError state via its own
      // try/catch in handleSubmit — no change needed there.
      throw new Error(data.message || 'Could not sign in.')
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    navigate('/home')
  }

  return (
    <Login
      onSubmit={handleLoginSubmit}
      onForgotPassword={() => navigate('/forgot-password')}
    />
  )
}