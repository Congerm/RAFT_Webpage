import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ROLE_NAMES } from '../lib/supabase'

export default function Layout() {
  const { session, loading, role, email, signOut } = useAuth()

  if (loading) return <div className="center-msg">Loading…</div>
  if (!session) return <Navigate to="/signin" replace />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">RAFT Front Desk</div>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/clients">Client Lookup</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/records">Add / Edit</NavLink>
        </nav>
        <div className="userbox">
          <span className={`badge role-${role ?? 'none'}`}>
            {role ? ROLE_NAMES[role] : 'No staff role'}
          </span>
          <span className="email">{email}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>
      {!role && (
        <p className="warn">
          Your account has no staff role, so the database will not return any
          data. Ask an administrator to assign one.
        </p>
      )}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
