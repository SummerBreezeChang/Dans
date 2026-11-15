# FirstCare+ — Product Requirements (README)

**A little help. A lot of care.**
FirstCare+ is a caregiver-coordination app. It helps a patient or primary caregiver turn "who's doing what this week?" into a shared plan that the whole care circle can see and pick up.

Full PRD: https://claude.ai/artifact/Ts4DTNWLygEYzTwuhfExx5

## What it does

1. The patient or primary caregiver creates an account and builds a care circle.
2. A weekly care plan is created: appointments plus the tasks around them (rides, meals, medicine pickup, at-home care, follow-ups).
3. Tasks are assigned automatically based on each caregiver's availability and weekly task cap. Caregivers can also sign up for open tasks, swap, or decline with a private reason.
4. When plans change (for example, a rescheduled chemo infusion), linked tasks move with it and the circle is notified.
5. Every caregiver is notified by email or phone number.

## App structure (tabs)

| # | Tab | Purpose |
|---|-----|---------|
| 1 | My tasks (landing) | What you've taken on |
| 2 | Unclaimed | Open tasks that still need a helping hand, with a count badge |
| 3 | All tasks | Everyone's tasks, with sign-up and swap options |
| 4 | Completed | What's already taken care of |
| 5 | Summary | Week calendar with all tasks and assignees, plus the four stat tiles (Tasks this week, Taken care of, Need a helping hand, Your care circle) |

## PRD contents

- Project description (presentation-ready)
- Overview, goals, non-goals and success metrics
- Personas
- Core journey
- Functional requirements (P0 = hackathon build)
- Assignment logic
- Notifications
- Integrations (hospital record connection starting with Kaiser; AI via Lovable's built-in AI; Linq messaging is optional)
- Privacy
- Hackathon build plan (4 hours)
- Version 2: wearables (Apple Watch, Garmin, Oura and similar) feeding data back for caregiver review
- Risks and open questions (all answered)

## Hackathon constraints

- 4 hours, team of 3
- 100 Lovable credits; the demo must be shown on Lovable (our sponsor)
- Claude can't be used in the final presentation, so any live AI step uses Lovable's built-in AI
- Synthetic demo data only; no real notifications are sent in the prototype

## Tech

- Lovable app (React, Vite, Tailwind, Supabase), synced two-way with GitHub
- Messaging via Linq (iMessage/RCS/SMS) is optional

## Team workflow

- GitHub is the shared source of truth. Pull before you start, commit small, push often.
- Use Lovable only for changes that need its AI, since credits are charged only when Lovable's AI edits code.
- One person edits a given screen at a time to avoid merge conflicts.
