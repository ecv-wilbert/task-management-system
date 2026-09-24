# AGENTS.md

Operating guide for any agent (Claude, Codex, Cursor, etc.) or human continuing this project.
Read this file first, then `docs/PROGRESS.md` for the current state and next steps.

## What this is

**Punchlist**, a task management PWA. Users sign in with Supabase Auth and create, read, update and
delete their own tasks. It works offline and syncs when back online. Deployed on Vercel.

## Repo map

```
apps/web/                 Vite + React 19 + TypeScript PWA (the only deployable)
  src/features/auth/      Supabase auth: provider, route guard, login/sign-up page
  src/features/tasks/     Task CRUD: api.ts (Supabase calls), mutations.ts (optimistic +
                          offline defaults), queries.ts (hooks), UI components, tasks page
  src/features/dashboard/ Dashboard page, stat tiles, Recharts charts
  src/components/ui/      shadcn/ui components (generated, do not hand-edit; re-add via CLI)
  src/components/         App-level components (layout, logo, sync status, PWA prompt)
  src/lib/                supabase client, query client + IndexedDB persister, env, dates
  src/pages/              Landing + 404
packages/shared/          Types generated from the DB, Zod schemas, pure domain logic (stats)
supabase/migrations/      The database schema. Source of truth. Applied with `supabase db push`
docs/                     Architecture, data model, decisions, deployment, progress log
```

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

## Rules

1. **Schema changes only via new migration files.** Never edit a migration that has already been
   pushed. After `pnpm db:push`, run `pnpm db:types` and commit the regenerated types.
2. **Every table gets RLS** with owner-only policies, following `tasks` in the init migration.
3. **Data access goes through TanStack Query.** New writes are registered as mutation defaults in
   a `mutations.ts` (see `features/tasks/mutations.ts`) so they survive being queued offline.
   Supply ids client-side (`crypto.randomUUID()`) and use idempotent writes (upsert).
4. **No secrets in the repo.** The browser only ever gets the *publishable* key
   (`VITE_SUPABASE_PUBLISHABLE_KEY`). The secret key and DB password stay out of `apps/web`.
   `.env*` and `*.local` are gitignored; `.env.example` documents the variables.
5. **shadcn components**: add with `pnpm dlx shadcn@latest add <name>` inside `apps/web`.
6. **Pure logic lives in `packages/shared`** (or a plain `.ts` next to the feature) with a Vitest test.
7. **Keep the docs true.** If you change behaviour covered in `docs/`, update the doc in the same
   commit. Record non-obvious choices in `docs/DECISIONS.md`.
8. **End every working session by updating `docs/PROGRESS.md`**: what changed, what's next, and
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
