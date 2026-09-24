# Progress and handoff

The living status of the project. **Update this at the end of every working session**: move items
between lists, and add a session log entry saying what you did and what's half-done.

## Status

Phase 1 (take-home brief) is complete and deployed.

| Brief requirement | Status | Where |
| --- | --- | --- |
| Small web app with full CRUD | Done | `apps/web/src/features/tasks` |
| Supabase as the database | Done | `supabase/migrations`, project `dmwmeefalvjmazlgzprp` |
| Next.js / React+Vite / TypeScript | Done | Vite + React + TS |
| API integrations (a plus) | Done (not yet on production UI) | Punchy assistant: Supabase Edge Function → Gemini. See `docs/PUNCHY.md` |
| Code on GitHub | Done | https://github.com/ecv-wilbert/task-management-system |
| Deployed on Vercel | Done | https://task-management-system-two-puce.vercel.app |
| README with description and setup | Done | `README.md` |
| Review call: walkthrough + live change | Prep notes ready | `docs/REVIEW_CALL.md` |

## Verified on production (2026-09-24)

- Sign-up (profile row created by trigger, name shown on dashboard), sign-in, sign-out
- Create / edit / mark done / delete tasks; `completed_at` set by trigger
- RLS: anonymous `select` returns `[]`; anonymous `insert` is rejected (42501)
- Service worker controls the page; app shell precached
- Offline: 2 changes made offline showed "2 changes will sync", were persisted, and replayed to
  Supabase after reload with the network back
- Layout at 375px and 1280px

## Roadmap (next up, roughly in priority order)

1. **Ship to production**: commit and push to `main`. Everything server-side (functions, secrets,
   migrations, auth settings, passkeys) is already live on Supabase; only the web UI is undeployed.
2. **Test passkeys on production** after the deploy (they can't run on localhost): add one from
   Passkeys in the sidebar on an iPhone, an Android phone and a desktop browser, sign out, sign back
   in with "Sign in with a passkey" and via email-field autofill.
3. **E2E tests** with Playwright: sign up → CRUD → offline replay. Run in GitHub Actions.
4. **CI**: GitHub Actions running `pnpm lint typecheck test build` on PRs.
5. **Projects / labels**: `projects` table + `tasks.project_id`, filter by project.
6. **Realtime**: subscribe to `tasks` changes so two open tabs/devices stay in sync.
7. **Sorting and pagination** on the tasks table once lists get long.
8. **Auth hardening before real users**: custom SMTP, turn email confirmation back on, password reset
   flow, optional Google OAuth.
9. Domain rename: **decided against for now** (passkeys are bound to the current URL, ADR-009). If it
   ever happens: `site_url`, Edge Function origins (`_shared/http.ts` or `PUNCHY_ALLOWED_ORIGINS`),
   passkey RP ID/origins (existing passkeys stop working), and the SEO URLs listed in ARCHITECTURE.md.

## Known issues / notes

- Entry JS chunk is ~513 kB (Vite warns above 500 kB). Signed-in routes are already lazy-loaded.
  If it grows, split supabase-js or zod into a separate chunk.
- Conflict handling is last write wins (fine for single-user lists).
- QA test accounts exist in Supabase Auth: `qa.punchlist.*@mailinator.com`, two
  `qa.punchy.*@mailinator.com` (Punchy testing, one with 5 tasks) and one
  `qa.signup.*@mailinator.com` (sign-up form test) and two `qa.multi.*@mailinator.com`
  (multi-account guard test). Delete them from Dashboard →
  Authentication → Users before the review if you want a clean slate.
- Punchy only accepts calls from the production URL and `localhost:5173`/`4173`. Vercel preview
  deploys need `PUNCHY_ALLOWED_ORIGINS`.
- A React warning "Encountered a script tag while rendering React component" shows in dev; most
  likely the theme script `next-themes` injects. Pre-existing, harmless.

## Session log

### 2026-09-24: initial build (Claude Code)
- Scaffolded pnpm monorepo: `apps/web` (Vite React TS), `packages/shared`, `supabase/`.
- Created Supabase project (Singapore), migration `init_schema` (profiles, tasks, enums, triggers,
  RLS), generated types.
- Built landing page, login/sign-up, dashboard (shadcn/ui + Recharts), tasks CRUD page.
- Offline: vite-plugin-pwa precache + TanStack Query IndexedDB persistence + queued mutations.
- Deployed to Vercel, set env vars, pushed Supabase auth config, verified on production.
- Docs: README, AGENTS.md, docs/*.
- Half-done: nothing.

### 2026-09-24: structure docs + pointer cursor (Claude Code)
- Added `docs/PROJECT_STRUCTURE.md`: annotated folder tree, FE vs BE boundary, create-task
  walkthrough, MVC mapping, and the plan for server-side logic (Edge Functions laid out
  controller/service/repository). Linked from README, AGENTS.md, ARCHITECTURE.md.
- All clickable controls now show `cursor: pointer` (one unlayered rule in `apps/web/src/index.css`;
  `components/ui` untouched).
- Decided not to add an MVC backend server; see "Should the backend be MVC?" in PROJECT_STRUCTURE.md.
- Half-done: nothing.

### 2026-09-24: Punchy assistant, jargon-free UI, auth doc (Claude Code)
- **Punchy** chat on the landing page and in the app. Edge Function `punchy` (controller/service/
  repository) calling Gemini with the adaptive-routine key (now a Supabase secret), shared
  guardrails in `packages/shared/src/punchy.ts` (16 tests), Postgres rate limits (migration
  `punchy_rate_limits`, pushed; types regenerated). Deployed with `pnpm fn:deploy`.
- Punchy drafts tasks with notes, priority, status and real due dates (knows local date, weekday and
  time; times go in notes); follow-ups edit the last draft; drafts show as cards and open the
  prefilled task form. It reads task notes (trimmed).
- Verified live: off-topic and prompt-injection refusals, invented-feature questions, injected task
  titles ignored, anonymous rate limit returns 429 after 10, quota table/function unreachable for
  anon, bad JWT → 401, disallowed origin → 403. Browser: landing + in-app chat, draft → form →
  task created, 375px layout, Escape closes.
- UI copy no longer mentions tech or vendors (landing footer, "database level" line, Punchy
  disclaimer); Punchy is told not to discuss how the app is built.
- Login page accepts `state.tab = 'sign-up'`; the landing "Create an account" button now opens the
  sign-up tab. `TaskFormDialog` takes a `draft` prefill. Toasts are offset above the chat button.
- New docs: `docs/PUNCHY.md`, `docs/AUTH.md` (encryption answers + passkey plan). Updated README,
  AGENTS, ARCHITECTURE, PROJECT_STRUCTURE, DATA_MODEL, DECISIONS (ADR-007, ADR-008), DEPLOYMENT.
- Half-done: passkeys are planned only (config reverted; see roadmap item 2). Nothing committed.

### 2026-09-24: passkeys, sign-up validation, SEO, Punchy crash fix (Claude Code)
- **Passkeys** live on Supabase (Management API; `config push` doesn't manage them), bound to the
  current URL. Login: "Sign in with a passkey" + email-field autofill. Sidebar: Passkeys dialog
  (add/list/remove). One-time "add a passkey" toast after sign-up. Friendly errors (tested).
  Verified: server issues registration options for the right RP ID; UI shows the "only on the
  Punchlist website" message on localhost. **Not yet verified with a real device** (needs prod).
- Config drift reconciled (pooler sizes match live; Twilio block undeclared); `config diff` clean.
- **Sign-up**: required-field asterisks, email format, duplicate check (new `check-email` function +
  `email_registered()` migration, rate limited), password rules enforced server-side
  (`lower_upper_letters_digits`), strength meter + checklist, common passwords refused, confirm
  password. **Sign-in**: empty/format validation, friendlier wrong-password message, no asterisks.
  Task form Title has an asterisk. Shared rules in `packages/shared/src/account.ts` (7 tests).
  Verified in the browser end to end, including a real sign-up.
- Edge Functions now share `supabase/functions/_shared/`; `pnpm fn:deploy` deploys all functions.
- **SEO**: title/description/canonical, OG + Twitter card with `og-image.png`, JSON-LD, noscript,
  robots.txt, sitemap.xml, per-page titles, `noindex` (meta + `X-Robots-Tag`) on login/app/errors,
  landing FAQ.
- **Fix**: "destroy is not a function" when a Punchy CTA navigated away. Effects in
  `punchy-panel.tsx` returned `scrollIntoView()`'s Promise (newer Chromium) as a cleanup. Also
  added a friendly route error page instead of React Router's dev screen.
- Punchy's guide knows about passkeys and the new password rules (redeployed).
- Half-done: nothing. Nothing committed.

### 2026-09-24: Punchy abuse guard (Claude Code)
- Punchy limits now use account, device ID (localStorage), browser signature + network, IP and a
  global cap, plus a multi-account rule (3 accounts per device, 10 per IP, per 24 h). One
  `punchy_guard()` call checks, counts and logs (migration `punchy_abuse_guard`; `guard.ts`;
  `lib/device.ts`; `packages/shared/src/client-signals.ts` with tests).
- Traffic log + review views in the `private` schema (`punchy_suspicious_devices`,
  `punchy_user_activity`, `punchy_daily_traffic`); hashed identifiers only; 30-day retention.
- Verified live: device limit, private-window reuse, IP limit, 4th account refused while account 1
  keeps working, events logged, API can't reach the log or call the guard. Browser: app sends
  headers and Punchy answers.
- Gemini's free-tier per-minute limit now reports "busy" (429) instead of a generic error.
- Punchy's guide mentions fair-use limits (redeployed).
- Half-done: nothing. Nothing committed.

