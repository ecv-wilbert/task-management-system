# AGENTS.md

Operating guide for any agent (Claude, Codex, Cursor, etc.) or human continuing this project.
Read this file first, then `docs/PROGRESS.md` for the current state and next steps.

## What this is

**Punchlist**, a task management PWA. Users sign in with Supabase Auth and create, read, update and
delete their own tasks. It works offline and syncs when back online. Deployed on Vercel.

## Repo map

```
apps/web/                 Vite + React 19 + TypeScript PWA (the only deployable)
  src/features/auth/      Supabase auth: provider, route guard, login/sign-up (validation),
                          passkeys, duplicate-email check
  src/features/tasks/     Task CRUD: api.ts (Supabase calls), mutations.ts (optimistic +
                          offline defaults), queries.ts (hooks), UI components, tasks page
  src/features/dashboard/ Dashboard page, stat tiles, Recharts charts
  src/features/punchy/    "Ask Punchy" assistant: launcher, lazy chat panel, api.ts
  src/components/ui/      shadcn/ui components (generated, do not hand-edit; re-add via CLI)
  src/components/         App-level components (layout, logo, sync status, PWA prompt)
  src/lib/                supabase client, query client + IndexedDB persister, env, dates, seo
  src/pages/              Landing (+ FAQ), 404, route error page
packages/shared/          Types generated from the DB, Zod schemas, pure logic (stats, punchy, account)
supabase/migrations/      The database schema. Source of truth. Applied with `supabase db push`
supabase/functions/       Edge Functions (Deno): `punchy` (assistant, Gemini key), `check-email`
                          (sign-up duplicate check), `_shared/` helpers
docs/                     Architecture, data model, decisions, deployment, progress log
```

Full annotated tree, FE/BE boundary and "where does new code go": `docs/PROJECT_STRUCTURE.md`.

## Commands (run from repo root)

| Command | What it does |
| --- | --- |
| `pnpm install` | Install all workspace deps |
| `pnpm dev` | Web app on http://localhost:5173 |
| `pnpm build` | Typecheck + production build (includes the service worker) |
| `pnpm preview` | Serve the production build on :4173 (use this to test PWA/offline) |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Checks. All three must pass before committing |
| `pnpm db:new <name>` | Create a new migration file |
| `pnpm db:push` | Apply pending migrations to the linked Supabase project |
| `pnpm db:types` | Regenerate `packages/shared/src/database.types.ts` from the live schema |
| `pnpm fn:deploy` | Deploy all Edge Functions (after changing `supabase/functions/` or `packages/shared/src/{punchy,account}.ts`) |

## Rules

1. **Schema changes only via new migration files.** Never edit a migration that has already been
   pushed. After `pnpm db:push`, run `pnpm db:types` and commit the regenerated types.
2. **Every table gets RLS** with owner-only policies, following `tasks` in the init migration.
   The only exception is service-role-only internals like `punchy_usage` (RLS on, no policies; ADR-008).
   Internal logs and admin views go in the `private` schema, which the API doesn't expose (ADR-012).
3. **Data access goes through TanStack Query.** New writes are registered as mutation defaults in
   a `mutations.ts` (see `features/tasks/mutations.ts`) so they survive being queued offline.
   Supply ids client-side (`crypto.randomUUID()`) and use idempotent writes (upsert).
4. **No secrets in the repo.** The browser only ever gets the *publishable* key
   (`VITE_SUPABASE_PUBLISHABLE_KEY`). The secret key and DB password stay out of `apps/web`.
   `.env*` and `*.local` are gitignored; `.env.example` documents the variables. Server-side keys
   (e.g. `GEMINI_API_KEY`) live in Supabase secrets and are only read by Edge Functions.
5. **shadcn components**: add with `pnpm dlx shadcn@latest add <name>` inside `apps/web`.
6. **Pure logic lives in `packages/shared`** (or a plain `.ts` next to the feature) with a Vitest test.
7. **Keep Punchy honest.** If you add or change a user-facing feature, update `PUNCHLIST_GUIDE` in
   `packages/shared/src/punchy.ts` and run `pnpm fn:deploy`, or Punchy will describe the old app.
8. **Keep the docs true.** If you change behaviour covered in `docs/`, update the doc in the same
   commit. Record non-obvious choices in `docs/DECISIONS.md`.
9. **End every working session by updating `docs/PROGRESS.md`**: what changed, what's next, and
   anything half-done. This is how the next agent picks up safely.

## Adding a feature (checklist)

1. If it needs data: `pnpm db:new <name>`, write SQL with RLS, `pnpm db:push`, `pnpm db:types`.
2. Add types/schemas to `packages/shared/src`, export from `index.ts`.
3. Add `api.ts` → `mutations.ts` → `queries.ts` → components under `apps/web/src/features/<name>/`.
4. Add the route in `apps/web/src/router.tsx` (lazy-load signed-in pages).
5. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
6. Update `docs/PROGRESS.md` (and other docs if behaviour changed). Commit.

## Environments

| | Where |
| --- | --- |
| Supabase project | ref `dmwmeefalvjmazlgzprp`, region `ap-southeast-1` (Singapore) |
| Vercel project | `task-management-system`; production deploys from `main` |
| GitHub | `ecv-wilbert/task-management-system` |

See `docs/DEPLOYMENT.md` for setup from scratch.
