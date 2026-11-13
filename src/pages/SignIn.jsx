import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function SignIn() {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signIn(email.trim(), password)
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="signin">
      <form className="card signin-card" onSubmit={submit}>
        <h1>RAFT Front Desk</h1>
        <p className="muted">Richmond Area Family Therapy — staff sign in</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">Sign in failed: {error}</p>}
        <button type="submit" disabled={busy || loading}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
