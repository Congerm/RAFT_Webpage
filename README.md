# RAFT Front Desk

A four-screen front-desk web app for the RAFT counseling agency, built for IS 302.
It reads and writes directly against the existing `raft` schema in our class
Supabase Postgres database — no tables, columns, or constraints were added,
changed, or removed.

**Live site:** https://congerm.github.io/RAFT_Webpage/

## Screens

- **Sign in** — Supabase Auth; required before any data appears (not counted as
  one of the four screens)
- **Home** — landing page + navigation hub
- **Client Lookup** — search clients; shows contact info, appointments,
  families, and family roles
- **Dashboard** — database-derived stats: record counts, kept-appointment rate,
  appointments per counselor, room usage, referral sources, recent
  appointments, and an admin-only employee wage table
- **Add / Edit Records** — add clients, add/edit appointments, mark visits
  kept, and write counselor notes/assignments (controls depend on your role)

Every screen has navigation to every other screen and a sign-out button.

## Staff roles

Role enforcement is done in the database, not just the UI. Three Postgres roles
(`raft_admin`, `raft_scheduler`, `raft_counselor`) hold the grants, and a
Supabase Custom Access Token hook (`public.raft_access_token_hook`) puts the
right role name into each user's JWT. The UI hides restricted columns, but
Postgres itself rejects queries a role isn't allowed to run.

| Login | Password | Can |
|---|---|---|
| `admin@raftcounseling.com` | `RaftAdmin#2026` | Everything, incl. wages |
| `scheduler@raftcounseling.com` | `RaftScheduler#2026` | Schedule clients/appointments; no wages, notes, or assignments |
| `counselor@raftcounseling.com` | `RaftCounselor#2026` | Notes + client assignments + kept; no scheduling, no wages |

## Tech

React 18 + Vite 6, `react-router-dom` (HashRouter so GitHub Pages works without
server rewrites), `@supabase/supabase-js` configured with `db: { schema:
'raft' }`. Deployed to GitHub Pages from the `gh-pages` branch via
`npm run deploy` (the `gh-pages` npm package publishes `dist/`).

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run deploy   # build + publish dist/ to gh-pages branch
```

## AI usage disclosure (assignment write-up)

**Tool used:** [Devin](https://devin.ai) (Cognition), an AI coding agent,
working in the project directory over several chat sessions.

**Initial prompt:** the assignment brief was given essentially unchanged —
"build a front-desk website with sign-in + Home/Client Lookup/Dashboard/Add-Edit
screens against the existing `raft` schema, with database-enforced staff roles,
deployed to a public URL" — along with the class Supabase project.

**What the AI got wrong / left out, and fixes:**

- *Wrong schema assumptions.* The AI first wrote queries against my local
  `raft_3_implementation.sql`, which uses `personid` subclass keys and a `fills`
  table. The real class schema uses `employeeid`/`clientid`/`memberid` and
  `member_role`. Fixed by reading the official `build_script.sql` and verifying
  the live schema through the Supabase MCP server before finalizing queries.
- *Missing DB setup.* The app was built before the roles existed: the `raft`
  schema wasn't exposed to the Data API, and there were no `raft_*` roles,
  grants, hook, or staff users. The AI applied the exposure + grants + access
  token hook function via SQL and created the three staff users; I enabled the
  hook in the Supabase dashboard (Auth → Auth Hooks).
- *Auth 500s from hand-created users.* Directly inserted auth rows initially
  had `NULL` token columns GoTrue couldn't scan and duplicate empty `phone`
  values; fixed by setting token fields to `''` and phone to `NULL`.
- *Deployment approach.* The AI originally set up a GitHub Actions workflow,
  which failed because of account billing. Replaced with branch deployment
  (`gh-pages` package + Pages set to "Deploy from a branch").

**Step 7 change (made after first deployment):** added a "How clients found
RAFT" card to the Dashboard that counts clients per referral source from
`client.foundout` (Family, Radio, Billboard, Postcard, …). It's a real
improvement for a front desk — referral sources tell staff which outreach
channels actually bring clients in — and it exercises a column no other screen
displays. Committed on `main`, published via `npm run deploy`, and verified
live on the production URL.

## Repo history

- `16f8b71` — first AI-generated working app (the "first AI output" commit)
- `3b8bda5` — switch deployment to `gh-pages` branch (Actions billing failure)
- `5cc4610` — Step 7 change: referral-source dashboard stat
