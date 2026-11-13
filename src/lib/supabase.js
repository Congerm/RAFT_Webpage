import { createClient } from '@supabase/supabase-js'

// The publishable key is meant to be public. Never put the service_role key here.
const SUPABASE_URL = 'https://rcbnqnhfkhhvxqjhykia.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mo0cWjpyKrBK06PuaxbNpg_yQlloNmh'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'raft' },
})

// Map the database role embedded in the access token to a display name.
export const ROLE_NAMES = {
  raft_admin: 'Admin',
  raft_scheduler: 'Scheduler',
  raft_counselor: 'Counselor',
}

export function roleFromSession(session) {
  if (!session?.access_token) return null
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]))
    return ROLE_NAMES[payload.role] ? payload.role : null
  } catch {
    return null
  }
}

// Capability flags derived from the database grants for each staff role.
// The database is the real enforcement; these just decide what the UI offers.
export function capabilities(role) {
  return {
    // Who can see employee.wage
    canSeeWages: role === 'raft_admin',
    // Who can see appointment.notes and scheduledfor.assignment
    canSeeNotes: role === 'raft_admin' || role === 'raft_counselor',
    canSeeAssignments: role === 'raft_admin' || role === 'raft_counselor',
    // Scheduling: people, clients, rooms, appointments
    canSchedule: role === 'raft_admin' || role === 'raft_scheduler',
    // Counselor work: appointment notes, client assignments, kept
    canChart: role === 'raft_admin' || role === 'raft_counselor',
  }
}
