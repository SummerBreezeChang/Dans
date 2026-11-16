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
