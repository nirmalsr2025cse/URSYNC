// src/pages/SignupPage.jsx
//
// Mounts the Signup component and wires its onSubmit prop to the real
// auth API. Signup.jsx itself stays a pure, reusable presentational
// component with no networking logic — same pattern as LoginPage.jsx.
import { useNavigate } from 'react-router-dom'
import Signup from './Signup'

const BASE_URL = 'http://localhost:5000/api'

export default function SignupPage() {
  const navigate = useNavigate()

  async function handleSignupSubmit({ name, department, email, phone, password }) {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, department, email, phone, password }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      // Surfaces in Signup.jsx's existing formError state via its own
      // try/catch in handleSubmit — no change needed there.
      throw new Error(data.message || 'Could not create account.')
    }

    // No token is returned on signup — the account is PendingVerification
    // until an administrator activates it, so there's nothing to store
    // here. Redirect to login with a message instead of the dashboard.
    navigate('/login', { state: { signupMessage: data.message } })
  }

  return (
    <Signup
      onSubmit={handleSignupSubmit}
      onGoToLogin={() => navigate('/login')}
    />
  )
}