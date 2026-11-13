import { useEffect, useState } from 'react'
import { supabase, capabilities } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export const fmtDT = (ts) =>
  ts ? String(ts).replace('T', ' ').slice(0, 16) : '—'

export default function ClientLookup() {
  const { role } = useAuth()
  const caps = capabilities(role)
  const [clients, setClients] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [appts, setAppts] = useState(null)
  const [families, setFamilies] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('client')
      .select(
        'clientid,foundout,remindermethod,referredby,' +
          'person(firstname,lastname,address,city,state,zip,phone,email)',
      )
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setClients(data)
      })
  }, [])

  const select = (c) => {
    setSelected(c)
    setAppts(null)
    setFamilies(null)
    setError(null)

    // Scheduler cannot see assignment or notes — those columns are left out
    // entirely, because the database rejects queries that ask for them.
    const sfCols = caps.canSeeAssignments
      ? 'appointmentid,clientid,kept,assignment'
      : 'appointmentid,clientid,kept'
    const apptCols = caps.canSeeNotes
      ? 'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber,notes'
      : 'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber'

    supabase
      .from('scheduledfor')
      .select(
        `${sfCols},appointment(${apptCols},room(roomnumber,roomname),` +
          'counselor(degreesuffix,person(firstname,lastname)))',
      )
      .eq('clientid', c.clientid)
      .order('appointmentid')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setAppts(data)
      })

    supabase
      .from('member_in_family')
      .select(
        'familyid,datejoined,family(familyname,datefounded),' +
          'member_role(role(rolename))',
      )
      .eq('memberid', c.clientid)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setFamilies(data)
      })
  }

  const q = query.trim().toLowerCase()
  const filtered = clients.filter((c) => {
    const p = c.person ?? {}
    return (
      !q ||
      `${p.firstname} ${p.lastname}`.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').includes(q)
    )
  })

  const referrer = selected?.referredby
    ? clients.find((c) => c.clientid === selected.referredby)
    : null

  const p = selected?.person

  return (
    <div>
      <h1>Client Lookup</h1>
      {error && <p className="error">{error}</p>}
      <div className="lookup">
        <div className="lookup-list">
          <input
            placeholder="Search by name, email, or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul>
            {filtered.map((c) => (
              <li key={c.clientid}>
                <button
                  className={selected?.clientid === c.clientid ? 'sel' : ''}
                  onClick={() => select(c)}
                >
                  {c.person?.lastname}, {c.person?.firstname}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="muted">No matches</li>}
          </ul>
        </div>

        {selected && p && (
          <div className="lookup-detail">
            <section className="card">
              <h2>
                {p.firstname} {p.lastname}
              </h2>
              <p>
                {p.address}
                <br />
                {p.city}, {p.state} {p.zip}
              </p>
              <p>
                {p.phone}
                <br />
                {p.email}
              </p>
              <p className="muted">
                Found out via: {selected.foundout ?? '—'} · Reminder:{' '}
                {selected.remindermethod ?? '—'}
                {referrer && (
                  <>
                    {' '}
                    · Referred by {referrer.person?.firstname}{' '}
                    {referrer.person?.lastname}
                  </>
                )}
              </p>
            </section>

            <section className="card">
              <h3>Appointments</h3>
              {appts === null && <p className="muted">Loading…</p>}
              {appts?.length === 0 && <p className="muted">None scheduled.</p>}
              {appts?.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Counselor</th>
                      <th>Room</th>
                      <th>Kept</th>
                      {caps.canSeeAssignments && <th>Assignment</th>}
                      {caps.canSeeNotes && <th>Notes</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {appts.map((s) => {
                      const a = s.appointment ?? {}
                      const cp = a.counselor?.person
                      return (
                        <tr key={s.appointmentid}>
                          <td>
                            {fmtDT(a.appointmenttime)} ({a.duration} min)
                          </td>
                          <td>
                            {cp ? `${cp.firstname} ${cp.lastname}` : '—'}
                            {a.counselor?.degreesuffix
                              ? `, ${a.counselor.degreesuffix}`
                              : ''}
                          </td>
                          <td>{a.room?.roomname ?? a.roomnumber}</td>
                          <td>
                            {s.kept === null
                              ? '—'
                              : s.kept
                                ? 'Yes'
                                : 'No'}
                          </td>
                          {caps.canSeeAssignments && (
                            <td>{s.assignment ?? '—'}</td>
                          )}
                          {caps.canSeeNotes && <td>{a.notes ?? '—'}</td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card">
              <h3>Families</h3>
              {families === null && <p className="muted">Loading…</p>}
              {families?.length === 0 && (
                <p className="muted">Not a member of any family.</p>
              )}
              {families?.map((m) => (
                <p key={m.familyid}>
                  <strong>{m.family?.familyname}</strong> family — joined{' '}
                  {m.datejoined} · roles:{' '}
                  {(m.member_role ?? [])
                    .map((r) => r.role?.rolename)
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              ))}
            </section>
          </div>
        )}
        {!selected && (
          <p className="muted lookup-hint">
            Choose a client on the left to see their details.
          </p>
        )}
      </div>
    </div>
  )
}
