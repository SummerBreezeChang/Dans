# Dans: rules for anyone editing this repo

Dans helps one person organize who helps someone through treatment. Read [README.md](README.md) for what it does. This file is about how to work on it without breaking it.

Every push to `main` deploys to the live demo at https://dans-support.vercel.app. The demo is being recorded and judged, so main must always work.

## Who edits what

| Area | Folders | Who |
|---|---|---|
| Screens | `src/components/calm`, `src/styles.css`, `src/routes` (pages only) | The UI agent |
| Texting, database, rules | `src/lib`, `src/routes/api.*`, `scripts`, `drizzle`, `vercel.json` | The backend agent |

- Work on a branch and open a pull request. Do not push to `main` unless you are the backend agent and the change is yours.
- Do not edit another area without asking Summer.
- Run `npm test`, `npx tsc --noEmit` and `npm run build` before you push. All three must pass.

## Texting is real

Dans sends real texts through Linq and reads the replies. Never assume it is a demo that sends nothing.

- An ask is one message: the question, a blank line, then "👍 reply YES / 👎 reply PASS". Do not add polls or buttons. Older phones show a blank box.
- Replies reach `/api/public/linq-webhook`. They are checked with the signing secret. A thumb, a typed YES or PASS, or an inline reply all count.
- A pass makes Dans ask the next free person by itself. The lead is never picked for that. If nobody is free, Dans asks the lead whether she can take it.
- Where a text goes is decided in one place, `routeText` in `src/lib/linq.server.ts`. A person with a saved phone is texted there. Everyone else goes to the one `SMS_SANDBOX_TO` phone, tagged.
- Never text a number that Summer has not said to use. Test texts go only to the numbers saved on Summer and Henry.
- Wording of every text lives in `src/lib/careSync.functions.ts`. Change it there and update the test.

## Database

One hosted Supabase project, `leunbrmnliggeixwxzuj`. There is no local database, and you should not set one up.

- The server uses the service key. The browser's public key cannot read or write the care tables. Keep it that way.
- Tables: `care_caregivers`, `care_tasks`, `care_activity`, `care_settings`, `care_sms_log`, `care_answers`.
- Maya's consent and Summer's notification settings are saved as entries in `care_activity`. Treat that table as the record of what happened.
- Tables are changed by the backend agent, in `drizzle/migrations`, and applied by Summer. Nobody else adds a migration.
- `supabase/config.toml` only names the project. The app reads its settings from the environment.

## How a text becomes data

Each person has one record, and everything about them is found by their id. `node --env-file=.env scripts/sync-report.mjs` prints it person by person and checks that nothing disagrees.

| What happens | Rows that change |
|---|---|
| A person joins from their link | `care_caregivers` (helps, free times, limit). `care_activity` "X joined". |
| Dans asks someone | `care_tasks` (owner, status "assigned"). `care_sms_log` (the ask, tied to task and person). |
| They answer with a thumb or typed YES or PASS | `care_answers` (who, which task, yes or pass, how). Then `care_tasks` and `care_activity`. |
| They say yes | `care_tasks.status` becomes "accepted". Dans asks the next open task. |
| They pass | The person is added to `care_tasks.declined_by`. The next free person becomes the owner and is asked. If nobody is free, the task is open and Summer is asked. |
| Summer takes a task | `care_tasks` owner is Summer, status "accepted". |
| Maya agrees or sends a note | `care_activity` "Maya shared her week" or "Maya sent a note". |
| Summer changes a notification setting | `care_activity` "Notification settings". |

Rules that keep it clear: a task with an owner is "assigned" or "accepted", and a task with no owner is "unclaimed". A person in `declined_by` is never the owner. Every ask in `care_sms_log` points at a real task and person. The report flags any that do not.

## Keys

Keys live in `.env` on Summer's computer and in Vercel's environment settings. Names are in `.env.example`. Never print a key, paste one into a chat, or commit one. If you do not have a key, you cannot test texting or the database. Write code and tests that need neither.

## Design

The look comes from Paper: https://app.paper.design/file/01M7E17JT8PJJVVZNVBKRQ1MGV/p-8-1. Summer's rule above all: clear and easy to navigate, never overwhelming.

- One job per screen and one main action. Details sit behind a tap.
- Titles stay on one line. Soft background surfaces group things. Avoid divider lines.
- Four places in the main navigation: Home, Visits, Circle, Settings.
- Tap targets at least 44px. Text at least 11px. No inline styles: use the `c-*` classes.
- Plain, warm words. No em dashes in screen text.
- Do not copy the old Lovable layout. It was too dense.

## Old FirstCare+ screens

`/board`, `/checklist`, `/circle`, `/schedule`, `/onboarding`, `/setup`, `/signup`, `/auth` and `/wearables` are the version 1 screens. They are not part of Dans. Do not link to them, and do not build on them. The version 1 documents are in `docs/firstcare-v1-*.md`.
