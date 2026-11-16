# Dans MVP plan: assign a task, change the schedule, get the text

Goal: change a visit on the desktop and see the right text arrive on a phone.

## Audit against the Figma user flow

| Flow | Built | Missing |
|---|---|---|
| 1. Setting up the circle | Ten-step guided setup at `/setup`, in the Figma order | It saves nothing: no people, phone numbers or tasks are created. "Add visits by hand" has no form. |
| 2. Joining as a helper | Nothing. "I was invited to help" opens the board. | Link from the text, tap free times, weekly limit, a "Today" home that shows asks first. |
| 3. Sharing the week | Accept, swap and decline in the app. A text reply of "can't make it" hands the task to the next person and texts both. | A "yes" reply does nothing. No swap by text. No reminders. No calendar. The primary caregiver is not texted when nobody fits. |
| 4. When plans change | One simulated change (chemo, Thursday to Friday). Linked tasks move. Conflicts are reassigned and the new owner is texted. | Fixed in this change: the owner whose task moved but stayed theirs got no text, and new times were not saved. Still missing: "Still OK?" replies, telling Maya once, the 24-hour fallback. |
| Home | A category board for everyone | "Week" for the primary caregiver and "Today" for helpers, as in Paper. |

## What a phone test needs

1. A database for Dans. Five small tables: tasks, caregivers, settings, text log, activity. The migrations are in `drizzle/`.
2. Linq token and sending number in a local `.env` file. Never in chat or in git.
3. A real phone number on one caregiver.
4. Only for replies: a public address for the Linq webhook, plus its signing secret.

Steps 1 to 3 are enough to test a schedule change from `localhost`.

## Build order

1. **Backend.** Create a Dans Supabase project, run the migrations, seed Maya's week and the three caregivers.
2. **Keys.** Fill in `.env` from `.env.example`. This is the moment to add the Linq key.
3. **Outbound test.** Live texting on, own number on one caregiver, press the reschedule. Expect one "plans changed" text.
4. **Replies.** Public address for the webhook. Add "yes" and "still OK" handling.
5. **Screens.** Week home and navigation from Paper, Today for helpers, the join flow, setup that saves, reminders.

## How each step is tested

- Message wording and the once-only rule: unit tests (`careText.test.ts`, `careSms.test.ts`).
- Reassignment logic: unit tests (`assignmentEngine.test.ts`, `smartReassign.test.ts`).
- Screens: local build checked at phone width first, then desktop.
- Live texts: one text to one known phone per step, with live texting off by default.

## Update: mobile first, installable, one-phone testing

Direction: Dans is a progressive web app, designed for the phone first and responsive up to desktop. The web gets a landing page. Navigation has five items or fewer.

### Where it stands

| Area | State |
|---|---|
| Installable | Manifest, icon and install tags added. No offline support yet. |
| Layout | Built desktop first, then squeezed. Bottom bar has six items. Top bar overflows at phone width. |
| Texting with one phone | Sandbox mode: every text goes to one number, tagged with who it was for. Replies not handled yet. |
| Landing page | None. `/` opens the app. |
| Sign up and sign in | Demo screens only. No real accounts. |

### Navigation proposal (four items)

| Item | Main caregiver | Helper |
|---|---|---|
| Home | The week: what is covered, the one thing that is not | Today: asks first, then my tasks |
| Visits | Appointments, change a visit, the checklist per visit | Read only |
| Circle | People, free times, limits, what they help with | My own settings |
| More | Hospital connection, privacy, texting, wellness, sign out | Same, less |

### Build order from here

1. One-phone text test of a schedule change (ready once the sandbox number is in `.env`).
2. Mobile-first shell: four-item bottom bar, the same items as a side rail on desktop, header that fits a phone.
3. Home for the main caregiver (the Paper "ask first" week) and Today for helpers.
4. Landing page at `/` on the web, app moved behind sign in.
5. Sign up, invite by text, join flow for helpers.
6. Replies by text: yes, can't, still OK. Needs a public address.
7. Offline shell and install prompt.

Each step is checked at 390 px wide first, then 768 and 1440, and added to the phone's home screen before it is called done.
