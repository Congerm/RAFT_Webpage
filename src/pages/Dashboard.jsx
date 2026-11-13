import { useEffect, useState } from 'react'
import { supabase, capabilities } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { fmtDT } from './ClientLookup'

export default function Dashboard() {
  const { role } = useAuth()
  const caps = capabilities(role)
  const [counts, setCounts] = useState({})
  const [appts, setAppts] = useState([])
  const [visits, setVisits] = useState([])
  const [employees, setEmployees] = useState([])
  const [clients, setClients] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const fail = (e) => e && setError(e.message)
    const count = (table, col) =>
      supabase.from(table).select(col, { count: 'exact', head: true })

    Promise.all([
      count('client', 'clientid'),
      count('person', 'personid'),
      count('family', 'familyid'),
      count('appointment', 'appointmentid'),
    ]).then(([c, p, f, a]) => {
      fail(c.error || p.error || f.error || a.error)
      setCounts({
        clients: c.count,
        people: p.count,
        families: f.count,
        appointments: a.count,
      })
    })

    const apptCols = caps.canSeeNotes
      ? 'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber,notes'
      : 'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber'
    supabase
      .from('appointment')
      .select(
        `${apptCols},room(roomname),counselor(degreesuffix,person(firstname,lastname))`,
      )
      .order('appointmenttime', { ascending: false })
      .then(({ data, error }) => {
        if (error) fail(error)
        else setAppts(data)
      })

    supabase
      .from('scheduledfor')
      .select('appointmentid,clientid,kept')
      .then(({ data, error }) => {
        if (error) fail(error)
        else setVisits(data)
      })

    supabase
      .from('client')
      .select('clientid,foundout')
      .then(({ data, error }) => {
        if (error) fail(error)
        else setClients(data)
      })

    // Only the admin may see employee.wage, so this query runs for admin only.
    if (caps.canSeeWages) {
      supabase
        .from('employee')
        .select('employeeid,datehired,wage,supervisorid,person(firstname,lastname)')
        .then(({ data, error }) => {
          if (error) fail(error)
          else setEmployees(data)
        })
    }
  }, [])

  const perCounselor = {}
  const perRoom = {}
  for (const a of appts) {
    const cp = a.counselor?.person
    const name = cp ? `${cp.firstname} ${cp.lastname}` : `ID ${a.counselorid}`
    perCounselor[name] = (perCounselor[name] ?? 0) + 1
    const room = a.room?.roomname ?? `Room ${a.roomnumber}`
    perRoom[room] = (perRoom[room] ?? 0) + 1
  }
  const perSource = {}
  for (const c of clients) {
    const src = c.foundout ?? 'Unknown'
    perSource[src] = (perSource[src] ?? 0) + 1
  }
  const marked = visits.filter((v) => v.kept !== null)
  const keptCount = marked.filter((v) => v.kept).length
  const keptRate = marked.length
    ? Math.round((100 * keptCount) / marked.length)
    : null

  return (
    <div>
      <h1>Dashboard</h1>
      {error && <p className="error">{error}</p>}
      <div className="stat-row">
        <div className="stat card">
          <div className="stat-num">{counts.clients ?? '—'}</div>
          <div className="stat-label">Clients</div>
        </div>
        <div className="stat card">
          <div className="stat-num">{counts.people ?? '—'}</div>
          <div className="stat-label">People on file</div>
        </div>
        <div className="stat card">
          <div className="stat-num">{counts.families ?? '—'}</div>
          <div className="stat-label">Families</div>
        </div>
        <div className="stat card">
          <div className="stat-num">{counts.appointments ?? '—'}</div>
          <div className="stat-label">Appointments</div>
        </div>
        <div className="stat card">
          <div className="stat-num">
            {keptRate === null ? '—' : `${keptRate}%`}
          </div>
          <div className="stat-label">
            Appointments kept ({keptCount}/{marked.length} marked)
          </div>
        </div>
      </div>

      <div className="card-row">
        <section className="card">
          <h3>Appointments per counselor</h3>
          <table>
            <tbody>
              {Object.entries(perCounselor)
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{n}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h3>Room usage</h3>
          <table>
            <tbody>
              {Object.entries(perRoom)
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{n} appointments</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h3>How clients found RAFT</h3>
          <table>
            <tbody>
              {Object.entries(perSource)
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{n} clients</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card">
        <h3>Most recent appointments</h3>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Counselor</th>
              <th>Room</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {appts.slice(0, 5).map((a) => (
              <tr key={a.appointmentid}>
                <td>{fmtDT(a.appointmenttime)}</td>
                <td>
                  {a.counselor?.person
                    ? `${a.counselor.person.firstname} ${a.counselor.person.lastname}`
                    : '—'}
                </td>
                <td>{a.room?.roomname ?? a.roomnumber}</td>
                <td>{a.duration} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {caps.canSeeWages && (
        <section className="card">
          <h3>Employee wages (admin only)</h3>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Hired</th>
                <th>Wage</th>
                <th>Supervisor</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.employeeid}>
                  <td>
                    {e.person?.firstname} {e.person?.lastname}
                  </td>
                  <td>{e.datehired}</td>
                  <td>${Number(e.wage).toFixed(2)}/hr</td>
                  <td>
                    {employees.find((s) => s.employeeid === e.supervisorid)
                      ?.person ? (
                      <>
                        {
                          employees.find(
                            (s) => s.employeeid === e.supervisorid,
                          ).person.firstname
                        }{' '}
                        {
                          employees.find(
                            (s) => s.employeeid === e.supervisorid,
                          ).person.lastname
                        }
                      </>
                    ) : (
                      e.supervisorid
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
