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
| API integrations (a plus) | Not started | See roadmap |
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

1. **API integration (brief says it's a plus).** Options, easiest first:
   - Public holidays (Nager.Date, no key) shown on the dashboard and as due-date warnings.
   - Supabase Edge Function that calls a third-party API with a secret key (shows server-side
     secret handling). Example: an AI "break this task into subtasks" button.
2. **E2E tests** with Playwright: sign up → CRUD → offline replay. Run in GitHub Actions.
3. **CI**: GitHub Actions running `pnpm lint typecheck test build` on PRs.
4. **Projects / labels**: `projects` table + `tasks.project_id`, filter by project.
5. **Realtime**: subscribe to `tasks` changes so two open tabs/devices stay in sync.
6. **Sorting and pagination** on the tasks table once lists get long.
7. **Auth hardening before real users**: custom SMTP, turn email confirmation back on, password reset
   flow, optional Google OAuth.
8. Rename the Vercel production domain to something friendlier (Vercel → Settings → Domains), then
   update `site_url` in `supabase/config.toml` and run `supabase config push`.

## Known issues / notes

- Entry JS chunk is ~513 kB (Vite warns above 500 kB). Signed-in routes are already lazy-loaded.
  If it grows, split supabase-js or zod into a separate chunk.
- Conflict handling is last write wins (fine for single-user lists).
- QA test account `qa.punchlist.*@mailinator.com` exists in Supabase Auth with a few tasks. Delete it
  from Dashboard → Authentication → Users before the review if you want a clean slate.

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
