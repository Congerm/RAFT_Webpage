import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ROLE_NAMES } from '../lib/supabase'

export default function Home() {
  const { role, email } = useAuth()

  return (
    <div>
      <h1>Welcome to RAFT</h1>
      <p>
        Signed in as <strong>{email}</strong> — role:{' '}
        <strong>{role ? ROLE_NAMES[role] : 'none assigned'}</strong>
      </p>
      <div className="card-row">
        <Link className="card nav-card" to="/clients">
          <h2>Client Lookup</h2>
          <p>Find a client and see their contact details, appointments, and family memberships.</p>
        </Link>
        <Link className="card nav-card" to="/dashboard">
          <h2>Dashboard</h2>
          <p>Key statistics about RAFT: clients, appointments, counselor load, and room usage.</p>
        </Link>
        <Link className="card nav-card" to="/records">
          <h2>Add / Edit Records</h2>
          <p>Add clients and appointments, update records, and record visit notes.</p>
        </Link>
      </div>
    </div>
  )
}
