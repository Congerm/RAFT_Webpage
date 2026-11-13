import { useEffect, useState } from 'react'
import { supabase, capabilities } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { fmtDT } from './ClientLookup'

const toInputDT = (ts) =>
  ts ? String(ts).replace(' ', 'T').slice(0, 16) : ''
const fromInputDT = (v) => (v ? v.replace('T', ' ') : null)
const blank = (v) => (v === '' ? null : v)

const personLabel = (row) =>
  row?.person ? `${row.person.firstname} ${row.person.lastname}` : '?'

export default function Records() {
  const { role } = useAuth()
  const caps = capabilities(role)
  const [tab, setTab] = useState(null)
  const [lookups, setLookups] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    const apptCols = caps.canSeeNotes
      ? 'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber,notes'
      : 'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber'
    const visitCols = caps.canSeeAssignments
      ? 'appointmentid,clientid,kept,assignment'
      : 'appointmentid,clientid,kept'

    Promise.all([
      supabase
        .from('client')
        .select('clientid,foundout,remindermethod,referredby,person(firstname,lastname,address,city,state,zip,phone,email)'),
      supabase
        .from('counselor')
        .select('counselorid,degreesuffix,person(firstname,lastname)'),
      supabase
        .from('employee')
        .select('employeeid,datehired,supervisorid,person(firstname,lastname)'),
      supabase.from('room').select('roomnumber,roomname'),
      supabase
        .from('appointment')
        .select(`${apptCols},counselor(person(firstname,lastname)),room(roomname)`)
        .order('appointmenttime'),
      supabase
        .from('scheduledfor')
        .select(`${visitCols},appointment(appointmenttime),client(person(firstname,lastname))`),
    ]).then(([cl, co, em, ro, ap, vi]) => {
      const firstError = [cl, co, em, ro, ap, vi].find((r) => r.error)?.error
      if (firstError) setError(firstError.message)
      setLookups({
        clients: cl.data ?? [],
        counselors: co.data ?? [],
        employees: em.data ?? [],
        rooms: ro.data ?? [],
        appts: ap.data ?? [],
        visits: vi.data ?? [],
      })
    })
  }

  useEffect(load, [])

  const tabs = [
    caps.canSchedule && { id: 'new-client', label: 'New client' },
    caps.canSchedule && { id: 'new-appt', label: 'New appointment' },
    caps.canSchedule && { id: 'edit-appt', label: 'Edit appointment' },
    caps.canSchedule && { id: 'edit-client', label: 'Edit client' },
    {
      id: 'visit',
      label: caps.canChart ? 'Visit notes & records' : 'Visit records',
    },
  ].filter(Boolean)

  const active = tab ?? tabs[0]?.id

  return (
    <div>
      <h1>Add / Edit Records</h1>
      {error && <p className="error">{error}</p>}
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={active === t.id ? 'tab sel' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {!lookups && !error && <p className="muted">Loading…</p>}
      {lookups && (
        <>
          {active === 'new-client' && (
            <NewClient clients={lookups.clients} onSaved={load} />
          )}
          {active === 'new-appt' && (
            <NewAppointment {...lookups} onSaved={load} />
          )}
          {active === 'edit-appt' && <EditAppointment {...lookups} onSaved={load} />}
          {active === 'edit-client' && (
            <EditClient clients={lookups.clients} onSaved={load} />
          )}
          {active === 'visit' && <VisitRecords {...lookups} caps={caps} onSaved={load} />}
        </>
      )}
    </div>
  )
}

function Status({ msg }) {
  if (!msg) return null
  return <p className={msg.ok ? 'ok' : 'error'}>{msg.text}</p>
}

/* ---------------- New client (scheduler/admin) ---------------- */

const EMPTY_PERSON = {
  firstname: '',
  lastname: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  email: '',
  foundout: '',
  remindermethod: '',
  referredby: '',
}

function NewClient({ clients, onSaved }) {
  const [f, setF] = useState(EMPTY_PERSON)
  const [msg, setMsg] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    const { data: person, error: e1 } = await supabase
      .from('person')
      .insert({
        firstname: f.firstname,
        lastname: f.lastname,
        address: blank(f.address),
        city: blank(f.city),
        state: blank(f.state),
        zip: blank(f.zip),
        phone: blank(f.phone),
        email: blank(f.email),
      })
      .select('personid')
      .single()
    if (e1) return setMsg({ ok: false, text: e1.message })

    const { error: e2 } = await supabase.from('client').insert({
      clientid: person.personid,
      foundout: blank(f.foundout),
      remindermethod: blank(f.remindermethod),
      referredby: f.referredby ? Number(f.referredby) : null,
    })
    if (e2) return setMsg({ ok: false, text: e2.message })
    setMsg({ ok: true, text: `Added ${f.firstname} ${f.lastname} as a client.` })
    setF(EMPTY_PERSON)
    onSaved()
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h3>New client</h3>
      <div className="grid2">
        <label>First name<input required value={f.firstname} onChange={set('firstname')} /></label>
        <label>Last name<input required value={f.lastname} onChange={set('lastname')} /></label>
        <label>Address<input value={f.address} onChange={set('address')} /></label>
        <label>City<input value={f.city} onChange={set('city')} /></label>
        <label>State<input maxLength={2} value={f.state} onChange={set('state')} /></label>
        <label>ZIP<input value={f.zip} onChange={set('zip')} /></label>
        <label>Phone<input value={f.phone} onChange={set('phone')} /></label>
        <label>Email<input type="email" value={f.email} onChange={set('email')} /></label>
        <label>Found out via<input value={f.foundout} onChange={set('foundout')} /></label>
        <label>Reminder method<input value={f.remindermethod} onChange={set('remindermethod')} /></label>
        <label>
          Referred by
          <select value={f.referredby} onChange={set('referredby')}>
            <option value="">— none —</option>
            {clients.map((c) => (
              <option key={c.clientid} value={c.clientid}>
                {personLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Status msg={msg} />
      <button type="submit">Add client</button>
    </form>
  )
}

/* ---------------- New appointment (scheduler/admin) ---------------- */

function NewAppointment({ counselors, employees, rooms, clients, onSaved }) {
  const [f, setF] = useState({
    time: '',
    duration: 60,
    counselorid: '',
    employeeid: '',
    roomnumber: '',
  })
  const [picked, setPicked] = useState([])
  const [msg, setMsg] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (picked.length === 0)
      return setMsg({ ok: false, text: 'Pick at least one client.' })

    const { data: appt, error: e1 } = await supabase
      .from('appointment')
      .insert({
        appointmenttime: fromInputDT(f.time),
        duration: Number(f.duration),
        counselorid: Number(f.counselorid),
        employeeid: Number(f.employeeid),
        roomnumber: Number(f.roomnumber),
      })
      .select('appointmentid')
      .single()
    if (e1) return setMsg({ ok: false, text: e1.message })

    const { error: e2 } = await supabase.from('scheduledfor').insert(
      picked.map((clientid) => ({
        appointmentid: appt.appointmentid,
        clientid,
        kept: null,
      })),
    )
    if (e2) return setMsg({ ok: false, text: e2.message })
    setMsg({ ok: true, text: `Appointment #${appt.appointmentid} created.` })
    setPicked([])
    onSaved()
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h3>New appointment</h3>
      <div className="grid2">
        <label>
          Date &amp; time
          <input type="datetime-local" required value={f.time} onChange={set('time')} />
        </label>
        <label>
          Duration (min)
          <input type="number" min="1" required value={f.duration} onChange={set('duration')} />
        </label>
        <label>
          Counselor
          <select required value={f.counselorid} onChange={set('counselorid')}>
            <option value="">— choose —</option>
            {counselors.map((c) => (
              <option key={c.counselorid} value={c.counselorid}>
                {personLabel(c)} ({c.degreesuffix})
              </option>
            ))}
          </select>
        </label>
        <label>
          Scheduled by (employee)
          <select required value={f.employeeid} onChange={set('employeeid')}>
            <option value="">— choose —</option>
            {employees.map((e2) => (
              <option key={e2.employeeid} value={e2.employeeid}>
                {personLabel(e2)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Room
          <select required value={f.roomnumber} onChange={set('roomnumber')}>
            <option value="">— choose —</option>
            {rooms.map((r) => (
              <option key={r.roomnumber} value={r.roomnumber}>
                {r.roomnumber} — {r.roomname}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Clients scheduled</legend>
        {clients.map((c) => (
          <label key={c.clientid} className="check">
            <input
              type="checkbox"
              checked={picked.includes(c.clientid)}
              onChange={() => toggle(c.clientid)}
            />
            {personLabel(c)}
          </label>
        ))}
      </fieldset>
      <Status msg={msg} />
      <button type="submit">Create appointment</button>
    </form>
  )
}

/* ---------------- Edit appointment (scheduler/admin) ---------------- */

function EditAppointment({ appts, counselors, employees, rooms, onSaved }) {
  const [id, setId] = useState('')
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState(null)

  const pick = (v) => {
    setId(v)
    setMsg(null)
    const a = appts.find((x) => String(x.appointmentid) === v)
    setF(
      a
        ? {
            time: toInputDT(a.appointmenttime),
            duration: a.duration ?? '',
            counselorid: a.counselorid,
            employeeid: a.employeeid,
            roomnumber: a.roomnumber,
          }
        : null,
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('appointment')
      .update({
        appointmenttime: fromInputDT(f.time),
        duration: Number(f.duration),
        counselorid: Number(f.counselorid),
        employeeid: Number(f.employeeid),
        roomnumber: Number(f.roomnumber),
      })
      .eq('appointmentid', Number(id))
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Appointment updated.' })
    if (!error) onSaved()
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h3>Edit appointment</h3>
      <label>
        Appointment
        <select required value={id} onChange={(e) => pick(e.target.value)}>
          <option value="">— choose —</option>
          {appts.map((a) => (
            <option key={a.appointmentid} value={a.appointmentid}>
              #{a.appointmentid} · {fmtDT(a.appointmenttime)} ·{' '}
              {a.counselor?.person
                ? `${a.counselor.person.firstname} ${a.counselor.person.lastname}`
                : ''}{' '}
              · {a.room?.roomname ?? `Room ${a.roomnumber}`}
            </option>
          ))}
        </select>
      </label>
      {f && (
        <div className="grid2">
          <label>
            Date &amp; time
            <input type="datetime-local" required value={f.time}
              onChange={(e) => setF({ ...f, time: e.target.value })} />
          </label>
          <label>
            Duration (min)
            <input type="number" min="1" required value={f.duration}
              onChange={(e) => setF({ ...f, duration: e.target.value })} />
          </label>
          <label>
            Counselor
            <select required value={f.counselorid}
              onChange={(e) => setF({ ...f, counselorid: e.target.value })}>
              {counselors.map((c) => (
                <option key={c.counselorid} value={c.counselorid}>
                  {personLabel(c)} ({c.degreesuffix})
                </option>
              ))}
            </select>
          </label>
          <label>
            Scheduled by (employee)
            <select required value={f.employeeid}
              onChange={(e) => setF({ ...f, employeeid: e.target.value })}>
              {employees.map((e2) => (
                <option key={e2.employeeid} value={e2.employeeid}>
                  {personLabel(e2)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Room
            <select required value={f.roomnumber}
              onChange={(e) => setF({ ...f, roomnumber: e.target.value })}>
              {rooms.map((r) => (
                <option key={r.roomnumber} value={r.roomnumber}>
                  {r.roomnumber} — {r.roomname}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <Status msg={msg} />
      {f && <button type="submit">Save changes</button>}
    </form>
  )
}

/* ---------------- Edit client (scheduler/admin) ---------------- */

function EditClient({ clients, onSaved }) {
  const [id, setId] = useState('')
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState(null)

  const pick = (v) => {
    setId(v)
    setMsg(null)
    const c = clients.find((x) => String(x.clientid) === v)
    setF(
      c
        ? {
            ...Object.fromEntries(
              ['firstname', 'lastname', 'address', 'city', 'state', 'zip', 'phone', 'email'].map(
                (k) => [k, c.person?.[k] ?? ''],
              ),
            ),
            foundout: c.foundout ?? '',
            remindermethod: c.remindermethod ?? '',
            referredby: c.referredby ?? '',
          }
        : null,
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const cid = Number(id)
    const { error: e1 } = await supabase
      .from('person')
      .update({
        firstname: f.firstname,
        lastname: f.lastname,
        address: blank(f.address),
        city: blank(f.city),
        state: blank(f.state),
        zip: blank(f.zip),
        phone: blank(f.phone),
        email: blank(f.email),
      })
      .eq('personid', cid)
    if (e1) return setMsg({ ok: false, text: e1.message })
    const { error: e2 } = await supabase
      .from('client')
      .update({
        foundout: blank(f.foundout),
        remindermethod: blank(f.remindermethod),
        referredby: f.referredby ? Number(f.referredby) : null,
      })
      .eq('clientid', cid)
    setMsg(e2 ? { ok: false, text: e2.message } : { ok: true, text: 'Client updated.' })
    if (!e2) onSaved()
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h3>Edit client</h3>
      <label>
        Client
        <select required value={id} onChange={(e) => pick(e.target.value)}>
          <option value="">— choose —</option>
          {clients.map((c) => (
            <option key={c.clientid} value={c.clientid}>
              {personLabel(c)}
            </option>
          ))}
        </select>
      </label>
      {f && (
        <div className="grid2">
          <label>First name<input required value={f.firstname} onChange={(e) => setF({ ...f, firstname: e.target.value })} /></label>
          <label>Last name<input required value={f.lastname} onChange={(e) => setF({ ...f, lastname: e.target.value })} /></label>
          <label>Address<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
          <label>City<input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
          <label>State<input maxLength={2} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></label>
          <label>ZIP<input value={f.zip} onChange={(e) => setF({ ...f, zip: e.target.value })} /></label>
          <label>Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label>Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label>Found out via<input value={f.foundout} onChange={(e) => setF({ ...f, foundout: e.target.value })} /></label>
          <label>Reminder method<input value={f.remindermethod} onChange={(e) => setF({ ...f, remindermethod: e.target.value })} /></label>
          <label>
            Referred by
            <select value={f.referredby} onChange={(e) => setF({ ...f, referredby: e.target.value })}>
              <option value="">— none —</option>
              {clients.map((c) => (
                <option key={c.clientid} value={c.clientid}>
                  {personLabel(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <Status msg={msg} />
      {f && <button type="submit">Save changes</button>}
    </form>
  )
}

/* ---------------- Visit records (all roles; notes/assignment for counselor/admin) ---------------- */

function VisitRecords({ appts, visits, caps, onSaved }) {
  const [apptId, setApptId] = useState('')
  const appt = appts.find((a) => String(a.appointmentid) === apptId)
  const rows = visits.filter((v) => String(v.appointmentid) === apptId)

  return (
    <div className="card form">
      <h3>{caps.canChart ? 'Visit notes & records' : 'Visit records'}</h3>
      <label>
        Appointment
        <select value={apptId} onChange={(e) => setApptId(e.target.value)}>
          <option value="">— choose —</option>
          {appts.map((a) => (
            <option key={a.appointmentid} value={a.appointmentid}>
              #{a.appointmentid} · {fmtDT(a.appointmenttime)} ·{' '}
              {a.counselor?.person
                ? `${a.counselor.person.firstname} ${a.counselor.person.lastname}`
                : ''}
            </option>
          ))}
        </select>
      </label>

      {caps.canChart && appt && <NotesEditor appt={appt} onSaved={onSaved} />}
      {rows.map((v) => (
        <VisitRow key={`${v.appointmentid}-${v.clientid}`} v={v} caps={caps} onSaved={onSaved} />
      ))}
      {apptId && rows.length === 0 && (
        <p className="muted">No clients are scheduled for this appointment.</p>
      )}
    </div>
  )
}

function NotesEditor({ appt, onSaved }) {
  const [notes, setNotes] = useState(appt.notes ?? '')
  const [msg, setMsg] = useState(null)

  const save = async () => {
    const { error } = await supabase
      .from('appointment')
      .update({ notes: blank(notes) })
      .eq('appointmentid', appt.appointmentid)
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Notes saved.' })
    if (!error) onSaved()
  }

  return (
    <div className="visit-block">
      <label>
        Appointment notes
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <Status msg={msg} />
      <button onClick={save}>Save notes</button>
    </div>
  )
}

function VisitRow({ v, caps, onSaved }) {
  const [kept, setKept] = useState(v.kept)
  const [assignment, setAssignment] = useState(v.assignment ?? '')
  const [msg, setMsg] = useState(null)

  const save = async () => {
    const update = { kept }
    if (caps.canChart) update.assignment = blank(assignment)
    const { error } = await supabase
      .from('scheduledfor')
      .update(update)
      .eq('appointmentid', v.appointmentid)
      .eq('clientid', v.clientid)
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Saved.' })
    if (!error) onSaved()
  }

  return (
    <div className="visit-block">
      <h4>
        {v.client?.person
          ? `${v.client.person.firstname} ${v.client.person.lastname}`
          : `Client ${v.clientid}`}
      </h4>
      <label>
        Kept
        <select
          value={kept === null ? '' : String(kept)}
          onChange={(e) =>
            setKept(e.target.value === '' ? null : e.target.value === 'true')
          }
        >
          <option value="">Not marked</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
      {caps.canChart && (
        <label>
          Assignment
          <textarea
            rows={2}
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
          />
        </label>
      )}
      <Status msg={msg} />
      <button onClick={save}>Save</button>
    </div>
  )
}
