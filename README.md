# Lang10

**Live:** https://lang10-production.up.railway.app

Ten Japanese items a day, for English speakers. Short daily sets, spaced
repetition, streaks, and audio — in the browser, with or without an account.

- **Local-first.** Everything works with no account and no database. Progress is
  saved to `localStorage`.
- **Optional accounts.** Add a database and a secret and learners can sign up to
  sync progress across devices. Guest progress carries into the new account.
- **Desktop and mobile.** Responsive throughout, with a bottom nav on small
  screens and a distraction-free lesson player.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 |
| Database | Postgres via Prisma 7 (optional) |
| Auth | Email + password, bcrypt hashes, signed JWT session cookie (`jose`) |
| Deploy | Docker → Railway |

## Running locally

```bash
npm install
npm run dev
```

That is enough — the app runs in local-only mode with accounts disabled.

To work on accounts, point `DATABASE_URL` at a Postgres instance and set
`AUTH_SECRET`, then apply migrations:

```bash
cp .env.example .env   # fill in both values
npm run db:deploy
npm run dev
```

Generate a secret with `openssl rand -base64 32`.

## Deploying to Railway

1. Create a project from this repo. Railway reads `railway.json` and builds the
   `Dockerfile`; the healthcheck is `/api/health`.
2. Deploy. It comes up immediately in local-only mode.
3. To enable accounts, add a Postgres service, then set on the web service:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `AUTH_SECRET` = a generated secret
4. Redeploy. `scripts/start.sh` runs `prisma migrate deploy` on boot whenever
   `DATABASE_URL` is present, so the schema applies itself.

Also set `PORT=3000`. Railway injects `PORT=8080` by default, while a generated
domain targets the port you asked for — if the two disagree the service builds,
boots, reports itself healthy in the logs, and still answers every request with
a 502. Setting it explicitly keeps the domain, `EXPOSE`, and the start script in
agreement.

### Continuous deployment

The `lang10` service is connected to `tehjawn/lang10` with a single deployment
trigger on `main`, so pushes to that branch deploy automatically. Project-level
PR deploys are off, so pull requests and other branches never deploy.

Railway needs the GitHub App installed on the repo before a trigger can exist —
without it, setting the service source appears to succeed but silently creates
no trigger, and nothing ever auto-deploys.

To deploy from a working copy instead, `railway up` still works and bypasses the
trigger entirely.

### Using Supabase for the database

Supabase's direct host (`db.<ref>.supabase.co`) resolves to IPv6 only, which
Railway cannot reach. Use the Supavisor pooler instead, in session mode:

```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

The region is the project's, not necessarily the nearest one; connecting to the
wrong pooler fails with `Tenant or user not found`.

## How the learning engine works

A session is one day's goal (10 questions by default). The queue is built from
cards that are due for review, topped up with new material, and worked through
in chunks of five: new items are introduced, then that chunk is quizzed.

Scheduling is Leitner boxes with intervals of 0, 1, 2, 4, 8, 16 and 32 days. A
correct answer moves a card up one box; a wrong answer moves it down two rather
than back to zero, so one slip does not erase a well-known card. Cards reaching
box 3 count as learned.

Exercises escalate with the box: recognition (Japanese → English), then recall
(English → Japanese), then listening and typing. Typed answers accept the
English meaning, its listed alternates, and the romaji, ignoring case,
punctuation, and leading articles.

Audio uses the browser's own speech synthesis with a `ja-JP` voice. Where no
Japanese voice is installed, listening exercises drop out of the rotation
automatically.

Content lives in `src/data/japanese.ts` — 202 items across 13 units (both kana
syllabaries, core vocabulary, and survival phrases). Item ids are stable and
progress is keyed on them, so never renumber an existing id.

## Interaction defaults

Three defaults do most of the work of keeping the app quiet:

- **Dark by default.** The ink palette sits on bare `:root` and light is the
  override, so a visitor with JavaScript disabled still gets dark rather than a
  flash of white. A boot script in `<head>` applies the stored choice before
  first paint. The toggle holds no React state — which icon shows is decided by
  CSS from the `data-theme` attribute, so there is nothing to mismatch on
  hydration.
- **Correct answers advance themselves** after a short beat, so a clean run
  costs one interaction per question instead of two. Wrong answers always wait:
  that is the screen worth reading. Turn it off under Account.
- **A correct answer chimes.** A two-note rising fifth, synthesised with Web
  Audio rather than shipped as a file. It is triggered from the grading gesture
  itself, which is what satisfies browser autoplay rules. Wrong answers stay
  silent — the sound is encouragement, not a verdict. Turn it off under Account.
- **The home screen carries one decision.** The unit grid is collapsed behind a
  disclosure, and the account prompt waits until there is a streak or twenty
  items to protect — asking sooner is a decision with nothing behind it.

## Sync model

The client is the source of truth while you study; the server stores a JSON
blob per user. Pushes are debounced and **merged** rather than overwritten, so
two devices used offline both keep their work: per card the more recently
answered version wins, and counters take the higher value. Resetting progress
sends `replace: true`, the one case that overwrites.

Unknown or malformed progress is normalised on the way in (`normalizeProgress`),
so a stale or hand-edited blob can never break the app.

## Layout

```
src/
  app/            routes — dashboard, /learn, /progress, /account, auth, /api
  components/     app shell, session player, unit detail, UI primitives
  data/           the Japanese deck
  lib/            progress + SRS, session builder, store, auth, db, speech
prisma/           schema and migrations
scripts/start.sh  container entrypoint (migrate if configured, then serve)
```

## Notes

- `npm audit` reports advisories in `mysql2` and `deepmerge-ts`. Both arrive
  through the Prisma **CLI**, are never imported by the running app (this
  project uses Postgres), and the offered fix downgrades Prisma to 6.x. Left
  as-is deliberately.
- The runtime image carries the full dependency tree so the Prisma CLI can run
  migrations at boot. Trimming it is a straightforward later optimisation.
