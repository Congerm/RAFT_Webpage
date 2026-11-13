// Read-only probe of the live raft schema.
// Usage: SUPABASE_URL=... SUPABASE_KEY=... RAFT_EMAIL=... RAFT_PASSWORD=... node scripts/probe.mjs
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_KEY, RAFT_EMAIL, RAFT_PASSWORD } = process.env
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'raft' },
  auth: { persistSession: false },
})

const { data: auth, error: authError } =
  await supabase.auth.signInWithPassword({ email: RAFT_EMAIL, password: RAFT_PASSWORD })
if (authError) {
  console.error('SIGN-IN FAILED:', authError.message)
  process.exit(1)
}

const payload = JSON.parse(
  Buffer.from(auth.session.access_token.split('.')[1], 'base64').toString(),
)
console.log('signed in as', auth.user.email, '| jwt role claim:', payload.role)

const queries = {
  client_embed: ['client', 'clientid,foundout,remindermethod,referredby,person(firstname,lastname,address,city,state,zip,phone,email)'],
  counselor_embed: ['counselor', 'counselorid,degreesuffix,person(firstname,lastname)'],
  employee_admin: ['employee', 'employeeid,datehired,wage,supervisorid,person(firstname,lastname)'],
  employee_restricted: ['employee', 'employeeid,datehired,supervisorid,person(firstname,lastname)'],
  room: ['room', 'roomnumber,roomname'],
  appointment_full: ['appointment', 'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber,notes,room(roomname),counselor(degreesuffix,person(firstname,lastname))'],
  appointment_restricted: ['appointment', 'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber,room(roomname),counselor(degreesuffix,person(firstname,lastname))'],
  scheduledfor_full: ['scheduledfor', 'appointmentid,clientid,kept,assignment,appointment(appointmenttime),client(person(firstname,lastname))'],
  scheduledfor_restricted: ['scheduledfor', 'appointmentid,clientid,kept,appointment(appointmenttime),client(person(firstname,lastname))'],
  family_membership: ['member_in_family', 'familyid,memberid,datejoined,family(familyname,datefounded),member_role(role(rolename))'],
  person: ['person', 'personid,firstname,lastname'],
  family: ['family', 'familyid,familyname,datefounded'],
  role: ['role', 'roleid,rolename'],
}

for (const [name, [table, cols]] of Object.entries(queries)) {
  const { data, error } = await supabase.from(table).select(cols).limit(2)
  console.log(
    error
      ? `FAIL ${name}: ${error.message}`
      : `OK   ${name}: ${data.length} row(s)`,
  )
}
