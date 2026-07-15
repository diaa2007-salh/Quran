# Quran Halaqat & Camp Management System

Extract this entire zip into your project root. It's now a complete,
self-contained project - `package.json`, `.gitignore`, `prisma.config.ts`,
and both `.env` files are included, not just source under `src/`.

## ⚠️ Read this first: credentials in this zip

The `.env` file in this delivery contains **real Neon database
credentials** and a **real generated AUTH_SECRET**, because real
credentials were pasted into the conversation that produced this zip.
Once a secret is visible in a chat, a log, or a screenshot, treat it as
already exposed:

1. **Reset the Neon database password** before using this in anything
   beyond your own local testing (Neon Console → Settings → Reset
   password). The connection strings in `.env` will stop working the
   moment you do - that's the point.
2. **Generate a fresh `AUTH_SECRET`** the same way (`openssl rand -base64
   32`) rather than reusing the one in `.env`.
3. Going forward, set real credentials directly in Vercel's Environment
   Variables UI rather than pasting them into a chat - `DEPLOYMENT.md`
   (Arabic, included) walks through exactly where.

This isn't a sign anything is broken - it's routine practice any time a
secret has been shared outside its intended system. The rest of this
README, and `DEPLOYMENT.md`, both repeat this at the relevant step so
it's not easy to miss.

## The real Vercel build log: what it actually showed

A real build log finally settled several things this README could only
speculate about before:

- **Every previous fix in this README worked.** `postinstall` ran `prisma
  generate` successfully, produced the client at `./generated/prisma`
  with zero errors, Turbopack compiled the whole app in 10.5s with no
  "Cannot find module" error anywhere - meaning the `prisma-client` +
  custom `output` approach is fine on Vercel, and the Turbopack
  resolution risk flagged in the previous round of this README did **not**
  reproduce here. Good evidence, not just an inference this time.
- **The actual failure was different and much narrower**: `next build`'s
  separate post-compile "Running TypeScript..." step failed with "It
  looks like you're trying to use TypeScript but do not have the required
  package(s) installed" - despite `typescript` being correctly listed in
  `package.json`.

**Root cause, confirmed by inspecting the actual package**:
`typescript@7.0.2`'s `package.json` resolves its main import (`"."`) to
`./lib/version.cjs` - a small stub, not the traditional Compiler API
module (`./lib/typescript.js`) that Next.js's build tooling has always
`require()`'d to run its own type-checking pass. TypeScript 7.0 moved the
real compiler API behind new `./unstable/*` subpath exports (part of the
native/Go-ported compiler effort) - a real, major restructuring, not a
bug in this project's config. Next.js 16.2.10 doesn't yet know how to
find TypeScript through that new shape, so it concludes TypeScript isn't
installed at all, even though it demonstrably is.

**Fix, verified by direct comparison, not assumed**: `typescript` is now
pinned to `6.0.3` - confirmed by installing it and inspecting its
`package.json` directly, its main export is still the traditional
`./lib/typescript.js`. The entire project was re-typechecked with `tsc
--noEmit` under 6.0.3 specifically (not just 7.0.2, which every earlier
check in this README used) and passes clean. `6.0.3` is npm's actual
latest 6.x release as of this check - not a guess, confirmed against the
real version list, since a mistyped patch version here would just trade
one install failure for another.

## Install

```
npm install
```

That's it - `package.json` lists every dependency this project actually
uses, pinned to the exact versions everything here was typechecked
against (see "Verified, not just written"). A `postinstall` hook runs
`prisma generate` automatically, so the generated client exists right
after install finishes - see the Prisma v7 section below for why that
step is no longer automatic elsewhere in the Prisma CLI the way it used
to be.

`postcss.config.mjs` is included - required for Tailwind v4 to process
`globals.css` at all in a Next.js build (v4 dropped the JS config file in
favor of this + `@import "tailwindcss"`; skipping it means none of the
styling in this drop renders, with no error to point at why).

## Vercel deployment fixes (this pass)

Real build errors on a real Vercel deployment surfaced three distinct,
legitimate bugs - not one. Each is worth understanding, not just trusting
the fix:

### 1. `settings.ts` was leaking `prisma` toward the client bundle

The original file mixed two things that needed to be separate: `getSettings`
(a plain function, calls `prisma` directly, meant only for Server
Components) and `updateSettings` (a Server Action, using a *function-level*
`"use server"` directive rather than a file-level one). `SettingsPanel.tsx`
(a Client Component) imports `updateSettings` from that same file - and the
moment a Client Component imports **anything** from a file that isn't
uniformly `"use server"` at the file level, the bundler can't cleanly
separate "the one function that's supposed to become a client-safe RPC
stub" from "everything else in this module," including a live import of
`prisma` (which pulls in `pg`, and through it Node built-ins like `net`,
`tls`, `dns` - none of which exist in a browser bundle).

Fixed by splitting into two files, each with one job:
- **`lib/settings-data.ts`** (new) - `getSettings` and the `CampSettings`
  type. No `"use server"` - it doesn't need one, since only Server
  Components ever import it, and a same-process `await` needs no RPC
  boundary at all.
- **`lib/actions/settings.ts`** - file-level `"use server"` as the very
  first line, containing only `updateSettings`. Every export in this file
  is now guaranteed to be treated as an action reference, uniformly, no
  matter what imports it.

Every layout that used to import `getSettings` from `lib/actions/settings`
now imports it from `lib/settings-data` instead - `app/layout.tsx`,
`app/teacher/layout.tsx`, `app/admin/layout.tsx`, `app/admin/page.tsx`.

**The broader lesson, applied**: every other action file (`attendance.ts`,
`memorization.ts`, `admin-actions.ts`, `admin-reports.ts`, `students.ts`,
`sign-out.ts`) was already file-level `"use server"` with nothing else
mixed in, and every Client Component's imports were re-audited against
this specific failure mode. `settings.ts` was the only one with the
problem - but it's the kind of bug `tsc --noEmit` cannot catch at all
(it's a bundler-level module-boundary concern, not a type error), which
is exactly why a real `next build` still matters even after everything in
this README passes a clean typecheck.

### 2. Prisma's generated client now lives at the project root

Previously `output = "../src/generated/prisma"` (nested under `src/`).
Prisma's and Vercel's own official Next.js guides both use a project-root
location instead - `output = "../generated/prisma"` - and this delivery
now matches that exactly rather than defending a custom alternative,
since matching the officially-tested path removes a variable when
something's already failing on a real deployment. `lib/prisma.ts` imports
from `../../generated/prisma/client` (a relative path, not a `@/*` alias -
the alias maps to `src/`, and the generated folder is now outside it on
purpose). `tsconfig.json`'s `include` was extended to cover the root-level
`generated/` folder, which it didn't before.

### 3. `lib/prisma.ts` now follows Vercel's own Fluid Compute pattern

Beyond the path fix, the adapter setup itself changed: rather than handing
`PrismaPg` a bare connection string, it now constructs a `pg.Pool`
explicitly and registers it with `@vercel/functions`'s
`attachDatabasePool` (guarded behind `process.env.VERCEL`, so local dev is
unaffected). This is Neon's and Vercel's own jointly-documented
recommendation for this exact stack: Vercel's Fluid Compute can freeze and
later reuse a function instance, and a connection opened before a freeze
can go stale by the time the instance wakes back up - `attachDatabasePool`
is what drains/manages that lifecycle correctly. This is a different
concern from fix #2 above (module resolution vs. runtime connection
health), and worth keeping distinct if you're troubleshooting a specific
error - a "cannot find module" error points at #2, an intermittent
connection error under load points at #3.

`prisma.config.ts` also now matches the official pattern exactly:
`url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ""` - a plain
fallback chain rather than requiring `DIRECT_URL` outright, so a simple
deployment with no separate pooler still works with zero config.

### 4. `next.config.ts` didn't exist until now

A real gap, not a fix to something broken: this project never had a
`next.config.ts` at all until this pass. `pg` (and the Prisma adapter
built on it) ships optional, conditional `require()`s for `pg-native` and
`cloudflare:sockets` that don't exist in a normal Node.js serverless
function - asking a bundler to statically analyze those is a well-known,
recurring source of exactly the "pg driver" build errors this whole
troubleshooting pass started from. The fix is `serverExternalPackages:
["pg", "@prisma/adapter-pg"]`, which tells Next.js to `require()` these at
runtime instead of bundling them - deliberately not the older `webpack()`
`IgnorePlugin` workaround some guides still show, since Turbopack (Next
16's default) doesn't run the `webpack()` config hook at all, so a
webpack-only fix would silently do nothing.

### 5. `@prisma/client` is back as a real dependency - and an honest, unresolved risk worth knowing about

Earlier in this project `@prisma/client` was removed entirely, since the
new `prisma-client` generator is documented as not needing it. It's back
now, pinned exactly to `7.8.0`, for a concrete reason: a real report from
Prisma's own community channel shows generated code from the
`prisma-client` generator still containing `import * as runtime from
"@prisma/client/runtime/library"` even when that package isn't installed
- meaning the "you don't need `@prisma/client` anymore" claim doesn't
fully hold in practice yet. Installing it is cheap insurance against
exactly that failure mode, regardless of whether this specific project
ever hits it. `prisma` (the CLI) moved back to `devDependencies` too -
its earlier move to `dependencies` was a preemptive hedge against a
Vercel-specific "prisma: command not found" issue Prisma's own docs
mention, but that's a conditional edge case, not the default/conventional
placement, and nothing so far pointed at this project actually hitting it.

**Something worth being direct about rather than glossing over**: a
detailed, technically specific account (an independent developer's
write-up, not official Prisma/Vercel material) describes the
`prisma-client` generator's ESM-structured, outside-`node_modules` output
specifically confusing Turbopack's module resolution during SSR on
Next.js 16 - the exact stack this project uses - with the workaround
being reverting to `prisma-client-js` and *no* custom `output` at all
(which is what an earlier version of this deployment-fixing request
asked for, and what this delivery pushed back on at the time). That
write-up predates the official Vercel Next.js+Prisma guide this delivery
otherwise matches exactly by several months, which is the most likely
explanation for the discrepancy - either the underlying resolution bug
was fixed in that window, or it doesn't reproduce in Vercel's specific
build environment. But "most likely" is an inference, not a verified
fact, and this can't be fully tested in the sandbox this was built in
(the same `prisma generate` network restriction mentioned throughout this
README). If a real Vercel build still produces a `Cannot find module`
error pointing at the generated client after everything in this README,
**that specific write-up's fix is the concrete fallback**: `provider =
"prisma-client-js"` with no `output` field in `schema.prisma`, then
update `lib/prisma.ts`'s import back to `"@prisma/client"`. That's a
real, if disruptive, plan B - not a shrug, and not a contradiction of the
pushback earlier in this conversation, which was about a different,
already-corrected point in that message.

## Prisma v7: a bigger discovery than it looks

Checking the currently-installed Prisma version while working on this
`.env` request turned up something more consequential than the request
itself: **Prisma is at v7.8.0**, and v7 is a genuinely major breaking
release - not a version-number footnote. The `schema.prisma` from Phase 1
of this project was written against the previous generation's
conventions and would fail outright against the Prisma actually
installed. Specifically, as of v7:

- **`url = env("DATABASE_URL")` inside `datasource` in `schema.prisma` is
  rejected at validation time** - "The datasource property url is no
  longer supported in schema files." The connection URL now lives only
  in `prisma.config.ts` (new, project root, included in this zip).
- **A driver adapter is required for every database** - Prisma Client can
  no longer open a Postgres connection on its own. `@prisma/adapter-pg`
  is now a real dependency, and `src/lib/prisma.ts` was rewritten around
  it (see below).
- **The generator provider changed** from `prisma-client-js` to
  `prisma-client`, and an explicit `output` path is now required -
  nothing is auto-generated into `node_modules` anymore. This project
  generates into root-level `generated/prisma` (gitignored, produced by
  `npx prisma generate` - see the `postinstall` hook above, and "Vercel
  deployment fixes" above for why it's root-level and not under `src/`).
- **`prisma generate` is no longer triggered automatically** by `migrate
  dev` or `db push` the way it used to be - you (or the `postinstall`
  hook) have to run it explicitly.

This touched every file across Phases 1-4 that imported types from
`"@prisma/client"` directly (`auth-guard.ts`, `types/next-auth.d.ts`,
`attendance.ts`, `admin-reports.ts`, `AttendanceToggleGrid.tsx`,
`AttendanceLogTable.tsx`, `ReportsView.tsx`) - all of them now import from
`"@/lib/prisma"` instead, which re-exports both the client singleton and
every model/enum type from the generated output in one place. Nothing
about your actual data model changed - `schema.prisma`'s models are
untouched - only how Prisma is configured and imported.

**This could not be fully verified end-to-end in the sandbox this was
built in** - `prisma generate` itself still needs to download a
schema-engine binary from `binaries.prisma.sh`, which is blocked by
network policy there, the same wall hit back in Phase 1. What *was*
verified: `prisma.config.ts`'s syntax loads successfully under a real,
installed Prisma 7.8.0 (confirmed by running it directly - it fails at
the same binary-download step, not at config parsing), and the
`tsc --noEmit` results throughout this README were checked against a
stub matching the v7 generated-client shape. Run `npx prisma generate`
for real on your own machine before trusting this further - it's the one
piece of this project that only your environment can confirm.

## Environment variables

`.env.example` (commit this) and `.env` (never commit this - already in
`.gitignore`, and it's pre-filled with a real generated secret for
convenience) are both included, with a full explanation next to every
variable. The short version:

- **`DATABASE_URL` and `DIRECT_URL`** - Prisma v7 wants both, not one.
  `DATABASE_URL` is what the running app uses (a pooled connection if
  your host offers one - essential on Vercel/serverless); `DIRECT_URL` is
  what the Prisma CLI uses for migrations (must be a direct, unpooled
  connection, or you'll hit "prepared statement already exists" errors).
  No pooler in your setup? Put the same value in both.
- **`AUTH_SECRET`** - `openssl rand -base64 32`, or `npx auth secret` to
  generate and write it for you. A different value per environment,
  always.
- **`AUTH_URL`** (`NEXTAUTH_URL` also works, same thing) - your canonical
  deployment URL. Usually auto-detected on Vercel production; set it
  explicitly on Vercel *preview* deployments and on any self-hosted
  server, or session cookies and `proxy.ts`'s redirects can resolve
  against the wrong host - this is the specific "Redirect problem" family
  the request asked about avoiding.
- **`AUTH_TRUST_HOST`** - `"true"` on anything behind a reverse proxy
  (self-hosted, Docker, most non-Vercel platforms). Skip it there and
  sign-in fails with an `UntrustedHost` error on the first attempt.
- **`NEXT_PUBLIC_APP_URL`** - public (browser-readable, per the
  `NEXT_PUBLIC_` prefix convention), for any future absolute-URL need
  distinct from what Auth.js uses `AUTH_URL` for internally. Nothing
  reads it yet; it's here because Phase 1's Settings and Phase 4's
  Reports are exactly the kind of feature that eventually wants one.

### Security notes before you deploy

- The `AUTH_SECRET` shipped in `.env` is a real, working value, generated
  for this delivery so local dev works immediately - **do not carry it
  into staging or production**, and treat it as already compromised
  the moment it's visible outside your own machine (which it now is,
  having been generated inside this conversation). Generate a fresh one
  per real environment.
- Never commit `.env`. `.env.example` is the only file meant for git;
  the included `.gitignore` already excludes every other `.env*`
  variant.
- Set real environment variables directly on your hosting platform for
  staging/production (Vercel Project Settings, a Docker `--env-file` not
  baked into the image, `systemd`'s `EnvironmentFile=`) rather than
  shipping an actual `.env` file to a server.
- `DIRECT_URL` should be a role with migration privileges (can alter
  schema); `DATABASE_URL` can - and for defense in depth, arguably
  should - use a more restricted role for everyday application queries if
  your Postgres host supports per-role permissions.
- Rotate `AUTH_SECRET` if it's ever exposed (a leaked `.env`, a
  compromised CI log, etc.) - every existing session gets invalidated
  when you do, which is the correct trade-off in that situation.



## tsconfig.json

Included, fixed for TypeScript 7: the standalone `baseUrl` option was
removed (`tsc` errors with TS5102 if present). Path aliases now resolve
relative to the config file itself:

```json
"paths": { "@/*": ["./src/*"] }
```

with no `baseUrl` line at all. If your existing tsconfig.json has
`"baseUrl": "."`, delete that line - keeping it will break the build on
current TypeScript regardless of anything else in this drop.

---

## Auth layer

- **auth.config.ts** + **auth.ts** - split config (Auth.js's own recommended
  pattern). `auth.config.ts` is edge-safe (no Prisma import) and holds the
  `authorized` callback that gates `/admin/**` to ADMIN and `/teacher/**` to
  TEACHER; `auth.ts` adds the Credentials provider, whose `authorize()`
  checks the DB, plus `jwt`/`session` callbacks that carry `id`/`username`/
  `role` onto the token and session.
- **proxy.ts** - **replaces `middleware.ts`**. Next.js 16 renamed the file;
  a file literally named `middleware.ts` is silently ignored at build time -
  no error, no warning, `/admin` and `/teacher` just stop being protected.
  Fast first layer: reads the JWT only, no DB call.
- **lib/auth-guard.ts** - `requireAdmin()` / `requireTeacher()`. Called at
  the top of every Server Action below. Re-reads the `User` row from the DB
  on every call, so freezing an account blocks it on its very next action
  instead of whenever its token happens to expire.
- **lib/prisma.ts**, **lib/password.ts**, **types/next-auth.d.ts**, the
  NextAuth API route - supporting pieces, see comments in each file.

## Phase 2 - Server Actions (`lib/actions/`)

- **settings.ts** - originally `getSettings()` (cached read for the root
  layout/Navbar/login page) and `updateSettings()` (Admin-only write)
  together in one file. **Since split** - see "Vercel deployment fixes"
  near the top of this README - `getSettings` now lives in
  `lib/settings-data.ts`; `settings.ts` keeps only `updateSettings()`.
  Uses `unstable_cache` + `updateTag`, not the new `'use cache'` directive -
  `'use cache'` needs `cacheComponents: true` in `next.config.js` to behave
  reliably, and this doesn't assume you've opted into that. If you have, the
  README section below shows the swap.
- **attendance.ts** - `setAttendanceStatus()` is the single upsert both the
  Lateness and Absence screens call (same `Attendance` row, keyed on the
  `[studentId, date]` unique constraint from your schema). Also
  `getTodayAttendanceForMyGroup()` and `getTodayAttendanceSummary()` for the
  dashboard's attendance-rate card.
- **memorization.ts** - the automated-continuation logic. `startSurah`/
  `startAyah` are **never** trusted from the client, even though the UI
  renders them locked: `recordWeeklyMemorization()` re-derives them
  server-side from the previous week's `endSurah`/`endAyah` every time.
  `ithmanCount` is computed by `lib/quran.ts` (see below), not guessed.
- **admin-actions.ts** - teacher create/freeze/reset-password, group
  create/update/delete, and student create/assign. Deleting a group does
  not delete its students - your schema's `onDelete: SetNull` unassigns
  them instead, and this file relies on exactly that.

## Phase 3 - Teacher UI (`components/shared/`, `app/teacher/`)

### Design system (`app/globals.css`)

Not the default AI-generated look on purpose (warm cream + serif + terracotta,
or near-black + one neon accent) - this needed its own identity, grounded in
the one thing the spec fixed in place: the app runs pre-Fajr and at night, so
dark mode isn't a checkbox feature, it's closer to the primary experience.

- **Palette**: warm ink/paper neutrals (`--color-ink*`, `--color-paper*`)
  instead of stock `gray`/`slate` - a near-black with a warm cast for dark
  mode rather than cold blue-black, warm ivory rather than stark white for
  light mode. The three Ithman band colors (`--color-band-red/yellow/green`)
  are muted, manuscript-pigment tones rather than literal traffic-light hex
  values, but kept saturated enough to still read as unambiguous status
  colors at a glance - legibility wins over restraint there.
- **The one color that's genuinely dynamic**: `--primary`, set on `<html>`
  in the root layout from `settings.primaryColor` (the Admin-configurable
  brand color from Phase 1). `@theme inline { --color-primary: var(--primary); }`
  is what makes `bg-primary`/`text-primary`/etc. resolve that CSS variable
  at runtime instead of a value baked in at build time - confirmed against
  Tailwind's own docs example for exactly this pattern.
- **Type**: three roles, not one font doing everything - Amiri (display,
  used sparingly: page titles, the camp name) for a little calligraphic
  warmth without leaning on it for dense text; IBM Plex Sans Arabic (body/
  UI) for labels, buttons, and forms; IBM Plex Mono (data) for surah/ayah
  numbers, dates, and counts, so tables read like instrument-panel data
  rather than prose.
- **Signature element - the Ithman meter** (`components/shared/IthmanMeter.tsx`):
  weekly progress renders as 8 filled segments (one hizb = 8 ithman), not a
  generic 0-100% bar. The shape of the meter *is* the unit being measured -
  a value over 8 fills every segment and adds a "+N" chip instead of
  wrapping, so "more than a hizb this week" can't misread as "started over."
- **Dark mode**: Tailwind v4 removed `darkMode: 'class'` from
  `tailwind.config.js` entirely - it's the `@custom-variant dark (&:where(.dark, .dark *));`
  line in `globals.css` now. `components/shared/ThemeToggle.tsx` flips
  `.dark` on `<html>` and persists to `localStorage`; an inline script in
  `app/layout.tsx`'s `<head>` applies the stored (or OS) preference before
  first paint so there's no flash of the wrong theme.
- **RTL**: the sidebar sits on the right deliberately, not by accident -
  `<aside>` is the *first* DOM child in the shell's flex row, so with
  `dir="rtl"` on `<html>` it lands at the reading-start side natively, no
  `flex-row-reverse` or hardcoded `right-*` needed. Spacing/positioning
  throughout uses logical properties (`ms-*`/`me-*`, `start-*`/`end-*`)
  rather than `ml-*`/`mr-*`/`left-*`/`right-*`.

### Files

- **components/shared/**: `AppShell.tsx` (the responsive shell - fixed
  sidebar `lg:` and up, slide-in drawer with a scrim below that, shared by
  Teacher and will be reused by Admin), `IthmanMeter.tsx`, `StatusBadge.tsx`,
  `SubmitButton.tsx`, `DeleteButton.tsx` (confirm-before-delete via
  `CustomModal`, never a bare single click), `FormInput.tsx`,
  `CustomModal.tsx`, `ThemeToggle.tsx`, `AttendanceToggleGrid.tsx` (the one
  grid component shared by both Lateness and Absence, per Phase 2's design -
  same upsert, different target status, different tone: amber for late, red
  for absent).
- **app/teacher/**: `layout.tsx` (the 4 sidebar items, exactly as specified -
  nothing added, nothing renamed), `page.tsx` (the home dashboard - "أبرز
  المعلومات في الواجهة الرئيسية" - today's attendance rate and this week's
  total ithman, deliberately **not** a 5th sidebar item, since the spec says
  the sidebar holds *exclusively* the 4 listed items; reached via the camp
  logo/name at the top of the sidebar instead), `students/`, `memorization/`
  (the automated-continuation form - the locked Start point is fetched fresh
  every time the entry dialog opens, never trusted from earlier client
  state), `lateness/`, `absence/`.
- **lib/week.ts**: `startOfWeek()` moved out of `memorization.ts` into its
  own module - it needed to be callable from pages computing "what week is
  it right now" with the exact same boundary logic the Server Action uses
  internally, not a second copy that could drift.
- **lib/surah-names.ts**: the 114 surah names for the End Surah picker,
  read from `quran-meta` rather than typed by hand - 114 names is exactly
  the size of list where one typo goes unnoticed.
- **lib/actions/students.ts, lib/actions/sign-out.ts**: two small
  additions Phase 2 didn't anticipate - a plain roster read for "أسماء
  التلاميذ", and a dedicated Server Action wrapping `signOut()` so the
  (client-boundary) `AppShell` can bind it to a form without importing
  `next-auth` internals into client code directly.

## `lib/quran.ts` - the ithman calculation, and why it's built this way

This turned out to be the one part of the spec that isn't just a coding
task - it needed real Quran structural data, and the two readings of
"ithman" available in practice aren't the same thing:

- **Hafs** (the riwaya practically every camp using Arabic sidebar labels
  like these will be reciting) marks 240 **Rub' al-Hizb** (quarter-hizb)
  boundaries. This is real, verified, printed-in-the-mushaf data.
- **Eighths (Thumun al-Hizb)** - what "ithman" literally means - are a
  **Qalun**-riwaya convention. They are not a standard Hafs marking at all.
  ([quran-meta](https://www.npmjs.com/package/quran-meta), the package this
  is built on, reports `numThumunAlHizbs: 0` for Hafs.)

So `ithmanCount` here follows the convention many halaqat already use
informally: each of the 240 real Hafs quarters, split at its ayah-count
midpoint into two eighths. The 240 boundaries themselves are exact; the
midpoint split is an approximation, but the error it introduces is bounded
to within a single quarter, not compounded across the Quran. `calculateIthmanCount()`
is fractional (e.g. `7.25`), so a student who stops mid-segment still gets
a meaningful, non-stepwise number for the red/yellow/green bands.

`nextStartPoint()` also explicitly detects a student finishing the entire
Quran (114:6) and returns `completedQuran: true` rather than silently
wrapping back to 1:1, the way the underlying library's own `nextAyah()`
does when used past the last ayah - confirmed by actually running it
against the real package, not assumed.

**Dependency note:** `quran-meta` is MIT-licensed, TypeScript-native, and
its own docs claim full unit-test coverage against multiple data sources -
verified against real Quran facts while building this (Al-Fatiha = 7 ayahs,
Al-Baqarah = 286, the first Rub' al-Hizb ends at 2:25, etc. all checked, not
assumed). It's maintained by a single author, which is worth knowing for a
production dependency; vendoring its Hafs quarter-boundary data yourself is
a reasonable alternative if you'd rather not depend on it directly.

## Verified, not just written

Every file here - the auth layer, all Server Actions (Phases 1-2 and the
Phase 4 admin-reports), the full Teacher + Admin UI, the Prisma v7
reconfiguration, and this pass's Vercel deployment fixes - was
typechecked with `tsc --noEmit` against the real `next@16.2.10`,
`next-auth@5.0.0-beta.31`, `react@19.2.7`, `zod@4.4.3`,
`tailwindcss@4.3.2`, `lucide-react@1.24.0`, `prisma@7.8.0`,
`@prisma/adapter-pg@7.8.0`, `@vercel/functions@3.7.5`, `pg@8.22.0`, and
`quran-meta@6.0.17` packages pulled from npm, plus a hand-written stub at
root-level `generated/prisma/client` matching what Prisma v7 would
actually generate there (its schema-engine binary download was blocked by
network policy in the sandbox this was built in, so the real client
couldn't be generated). The stub matches your schema's field names and
create/update payload shapes exactly, but doesn't enforce Prisma's
`include`/`select`-conditional typing the way the real generated client
does. Run `npx prisma generate` and your own `tsc` before you trust this
in production - nothing here depends on that having already happened,
but real usage does.

**Still not verifiable here**: an actual `next build` and an actual
Vercel deployment. `tsc --noEmit` cannot catch bundler-level "use client"/
"use server" module-boundary violations at all (bug #1 above is proof of
that - it typechecked cleanly the whole time), so a real build remains
the one check this whole delivery has never been able to substitute for.

Along the way this caught several real, non-obvious issues rather than
guessing past them:
- `middleware.ts` silently doing nothing in Next.js 16 (must be `proxy.ts`)
- a JWT module-augmentation gap specific to `next-auth@5.0.0-beta.31`
- TypeScript 7 removing standalone `baseUrl`
- `revalidateTag` now requiring a second cache-profile argument in Next 16
  (switched to `updateTag`, which is actually the more correct choice for
  a Server-Action read-your-own-writes update anyway)
- Hafs having no real "eighths" data at all, which changed the ithman
  design rather than just the implementation
- Tailwind v4 dropping `darkMode: 'class'` from JS config entirely, in
  favor of the `@custom-variant` line in CSS
- **Prisma v7 rejecting the `url` field in `schema.prisma` entirely** and
  requiring a driver adapter for every database - found while answering
  what looked like a simple "write the .env file" request, and the
  reason this delivery now includes `prisma.config.ts` and a rewritten
  `lib/prisma.ts` that Phase 1 didn't have
- **`settings.ts` mixing a plain `prisma`-calling function with a Server
  Action in one file**, invisible to `tsc` since it's a bundler-level
  concern, not a type error - found on a real Vercel build, not caught
  here first. See "Vercel deployment fixes" above.

## If you enable Cache Components (`cacheComponents: true`)

`settings-data.ts`'s `getSettings` becomes:

```ts
export async function getSettings() {
  'use cache'
  cacheTag('settings')
  // ...same body...
}
```

and `lib/actions/settings.ts`'s `updateSettings` keeps calling
`updateTag('settings')` - no change needed there.

## Phase 4 - Admin UI (`lib/actions/admin-reports.ts`, `app/admin/`)

### New backend

- **`getAllStudentsAttendance({ date, status?, groupId? })`** - every active
  student's attendance for one day, across all halaqat (not scoped to one
  teacher, unlike `attendance.ts`). Unset rows default to PRESENT, same
  convention as the teacher screens, so "no record yet" reads the same way
  everywhere.
- **`getTeacherMonitoringBoard()`** - the metric this needed defining, not
  just building: **"tracking consistency" = for every active student a
  teacher is responsible for, is there an Attendance row for today AND a
  WeeklyMemorization row for the current week?** Four states: `no_students`
  (nothing assigned - not the teacher's fault), `behind` (logged nothing at
  all, for anyone), `partial` (logged something but not everyone/both),
  `on_track` (both, for every student). This is one reasonable definition,
  not the only one - if your camp cares more about a rolling 7-day average
  than "today specifically," or wants to flag a teacher who's 3+ days
  quiet even if they logged today, that's a different metric and worth
  saying so before it ships.
- **`getGlobalCampStats()`** - active teacher/student/group counts, today's
  camp-wide attendance rate, and this week's total ithman across every
  halaqa. Same PRESENT-default and Saturday-week-start conventions as
  everywhere else.

### Admin layout & pages

- **layout.tsx** - the 5 sidebar items exactly as specified. Dashboard
  reached via the sidebar logo/name, same pattern as Teacher (Phase 3),
  since the spec lists it separately from the 5 nav items.
- **page.tsx** - "أبرز معلومات في الواجهة الرئيسية للمدير": 4 summary
  cards, reusing `components/shared/SummaryCard.tsx` (pulled out of
  `teacher/page.tsx` in this pass rather than duplicated), plus a "camp
  dynamic settings" panel (`_components/SettingsPanel.tsx`) - campName,
  logo URL, login welcome text, and the primary color (color-picker swatch
  + hex input) - wired to `updateSettings()` from Phase 2, which existed
  with no UI calling it until now. Saving calls `router.refresh()`, which
  is what actually demonstrates Phase 1's "changes show up across the
  system instantly" claim: the sidebar logo/name and the `--primary` CSS
  variable both read from the same `getSettings()` call this page uses.
- **students/** - search + group filter + client-side pagination (20/page)
  over the full roster, an "assign/reassign halaqa" modal per row, and an
  "add student" modal, since `createStudent` already existed in Phase 2
  with nothing calling it yet.
- **lateness/**, **absence/** - share one `components/admin/AttendanceLogTable.tsx`:
  a date picker (re-fetches from the server on change) and a group filter
  (client-side over the fetched day, since it doesn't need a new query).
- **teachers/** - directory, add-teacher modal, reset-password modal, and
  a freeze/unfreeze toggle (no confirmation dialog - unlike delete, it's
  fully reversible, so `DeleteButton`'s confirm-first pattern didn't apply).
- **monitoring/** - the board itself: one card per teacher, a status badge,
  and two `done/total` bars (today's attendance, this week's memorization).
  Fully read-only, so it stayed a Server Component - no client-side state
  needed anywhere on this page.

### A retroactive fix to Phase 2, found while building this

Every Server Action previously called `schema.parse(input)`, which
**throws** on invalid input. A thrown error inside a client `useTransition`
callback becomes an unhandled promise rejection - not a caught error, not a
message shown to the user, just silent failure. Building the Admin forms
surfaced this concretely (a password under 8 characters in
`CreateTeacherDialog` would trigger it). Fixed everywhere: every action now
uses a shared `safeParseOrError()` helper (`lib/actions/action-result.ts`)
and returns `{ success: false, error }` instead of throwing. While in there,
every remaining English-language error string (`"This student is not in
your group."`, Zod's default messages, etc.) was translated to Arabic -
Phase 2 was built and verified before there was any UI to notice that an
Arabic interface was about to show English error text.

### Reports & Export (`app/admin/reports/`)

The one requirement present in **both** original spec documents
("Reports & Exporting... PDF or Excel formats for printing" /
"interactive data-tables... print layouts (PDF-friendly) or export to
CSV") that hadn't been built through three "Phase 4 complete" messages -
it kept getting summarized out of the shorter, later breakdowns of the
admin sidebar, but the underlying requirement was still there in the
original ask.

- **Not a 6th sidebar item** - the last two messages specified the Admin
  sidebar precisely, twice, with 5 items and no Reports entry. Reachable
  instead from a card on the dashboard, same non-sidebar pattern as the
  dashboard itself.
- **`getAttendanceReport` / `getMemorizationReport`** (`admin-reports.ts`) -
  date-range queries, not just "today." Deliberately **do not** default
  missing attendance to PRESENT the way the live Lateness/Absence/dashboard
  screens do - a report reflects what was actually logged, not a live
  present/absent view, so a day nobody took attendance shows as no rows,
  not as "everyone present."
- **CSV export** (`lib/csv-export.ts`) - client-side, from whatever's
  currently filtered on screen. Prefixes a UTF-8 BOM, which is not
  optional: Excel's default CSV import without it renders the Arabic names
  as garbled text on Windows, even though the file itself is valid UTF-8.
- **Print** - `window.print()` plus `print:hidden` added to `AppShell`'s
  sidebar and mobile top bar, and a `@media print` override in
  `globals.css` that forces light colors even in dark mode (ink stays
  ink-colored on paper, dark backgrounds don't print as solid black
  rectangles). This applies to every page under the shell, not just
  Reports - anything can be printed cleanly now.

### What's still genuinely not built: offline mode

The original spec's "Offline Capabilities" section (cache attendance/
memorization locally when connectivity drops, sync once it's back) hasn't
been touched. This isn't an oversight the way Reports was - it's a
substantially different kind of work (a service worker, a local write
queue, conflict resolution for what happens if two teachers' offline
queues both touch the same student, and a decision about how far "offline"
extends - can a frozen account still write locally and sync later?) that
deserves its own scoped discussion rather than a bolted-on addition at the
end of a UI pass. Worth raising explicitly rather than leaving it quietly
unmentioned.



## Project status

Auth, the full data model, every Server Action (including the ithman
calculation and the cross-group admin reports), and the complete Teacher +
Admin UI - including Reports & Export, added in this pass - are in this
zip. Offline mode is the one original-spec item still open; see above. See
"Verified, not just written" below for exactly what was and wasn't
confirmed against real tooling, and "Assumptions worth confirming" for the
judgment calls made along the way - worth a read before a first deploy,
not because anything here is fragile, but because a few of them (the
Saturday week start, the monitoring board's definition of "consistent")
are product decisions dressed up as code, and you may want them to say
something slightly different.


## Assumptions and judgment calls worth confirming

- **Flat routes**: `app/admin/**`, `app/teacher/**`, no locale segment.
  Your spec mentioned `app/[locale]/layout.tsx` once, but nothing else in
  either spec document mentions supporting more than Arabic, so next-intl
  routing was not scaffolded.
- Wrong-role visits (a teacher opening `/admin/...`) redirect to `/login`,
  not a "forbidden" page - `authorized` returns a plain boolean rather than
  a custom redirect, since custom redirects from inside that callback have
  open, version-dependent reliability reports upstream.
- **Halaqa week starts Saturday** (`lib/week.ts`, `startOfWeek()`). One line
  to change if your camp's week runs Sun-Sat or Fri-Thu instead. This also
  drives the monitoring board and the dashboard's weekly ithman total, so
  changing it affects more than just the memorization screens now.
- Password minimum length is 8 characters (`admin-actions.ts`) - not
  specified in the spec, a reasonable default.
- Attendance-taking and memorization actions verify the student belongs to
  the calling teacher's own group before writing anything - not explicitly
  asked for, but the alternative (any teacher can mark any student present/
  absent) seemed clearly unintended.
- The teacher dashboard is reached via the sidebar's camp logo/name, not a
  5th nav item - the spec says the sidebar holds the 4 (Teacher) / 5
  (Admin) listed items exclusively, so neither dashboard is in that list
  even though both are real and built.
- A student with no assigned group shows an empty state on every teacher
  page rather than an error - there's no "no group yet" onboarding flow,
  since nothing in the spec described one.
- **The monitoring board's "tracking consistency" definition** (see Phase 4
  above) is a specific, stated choice among several reasonable ones - the
  one most likely to need a second look before this ships.
- The Admin "قائمة جميع التلاميذ" page includes an "add student" action
  since `createStudent` already existed with nothing calling it - not
  explicitly requested, easy to remove if you'd rather students only enter
  the system some other way.
- Freeze/unfreeze has no confirmation step (delete does, via
  `DeleteButton`) - it's fully reversible, so a confirmation dialog seemed
  like friction without a matching safety benefit.

