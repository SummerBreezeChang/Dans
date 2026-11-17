# Dans

A little help for the people who are helping. Dans lets one person organize who does what for someone going through treatment. Helpers answer with a thumbs up or down in a text, so nobody installs an app.

Live demo: https://dans-support.vercel.app (sample data, no login yet)

Dans is the second version of FirstCare+, built at the She Builds hackathon. The first version's README is in [docs/firstcare-v1-readme.md](docs/firstcare-v1-readme.md).

## The three people

| Who | What they do | Where |
|---|---|---|
| **Summer**, the owner | Sets up, confirms the week, sees who is coming, chooses what she is texted about | `/` Home, `/visits`, `/people`, `/more`, `/notifications`, `/summary`, `/start` |
| **Maya**, the person being cared for | Says yes to sharing her week, sees who is coming, tells Summer what she needs | `/maya` |
| **Helpers**: Henry, Nancy, Jack, Mary, Karen | Join from a link, say what they can do and when they are free, answer asks by text | `/join/<name>` |

## How a week works

1. Summer asks Maya first. Maya agrees and chooses what helpers can see.
2. Summer sends each helper their own link. They say what they can do and when they are free.
3. Dans asks one helper at a time by text: "Henry, can you pick up Maya's prescriptions Thu, Nov 19 at 12:30 PM?" with "👍 reply YES / 👎 reply PASS".
4. A thumbs down, or a typed PASS, and Dans asks the next free person on its own. If nobody is free, Dans texts Summer and asks whether she can take it.
5. Each morning at 7 AM Pacific, anyone with a task that day is asked if they can still do it.

## What is real and what is sample

- Real: texting through Linq, replies, the database, the morning reminder, who is asked next.
- Sample: the week of visits (labelled "Sample visit"), the people, and the times people are free.
- Not built yet: login, a calendar connection (Kaiser or any other), editing the list of tasks.

## How it is built

TanStack Start, Vite, Tailwind v4 and Vitest. Supabase for the database. Linq for texts. Vercel hosts it, and every push to `main` deploys.

```bash
npm install
cp .env.example .env     # fill in the values, never commit .env
npm run dev              # http://localhost:4180
npm test
npx tsc --noEmit
```

## Where things live

| Folder | What is in it |
|---|---|
| `src/components/calm` | The phone screens |
| `src/routes` | One file per address, and the `api.*` endpoints (Linq webhook, morning reminder) |
| `src/lib` | The rules: who can be asked, the wording of each text, how replies are read |
| `scripts` | Small tools for testing texts and saving phone numbers |
| `drizzle/migrations` | The database tables |
| `docs` | Plans, mock data, and the old FirstCare+ documents |

## Working on Dans

Read [AGENTS.md](AGENTS.md) first. It says who edits what and how texting and the database are set up.

## Links

- Paper (design): https://app.paper.design/file/01M7E17JT8PJJVVZNVBKRQ1MGV/p-8-1
- Status and test plan: https://app.notion.com/p/41b2d5cd4ef481e5848acfab769389fb
- Project links: https://app.notion.com/p/41a2d5cd4ef4810c917afecc5844aa67

Made-up data only. Not medical advice.
