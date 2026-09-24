# Punchlist: task management system

A task manager that works offline. Sign in, keep a list of tasks with status, priority and due
dates, and see what's open, due soon and overdue on a dashboard. It installs as a PWA, opens without a
connection, and syncs changes made offline once you're back online.

**Live:** https://task-management-system-two-puce.vercel.app

## Features

- **Auth:** email/password sign-up and sign-in with Supabase Auth. `/app` routes are protected.
- **Full CRUD on tasks:** create, list/filter/search, edit, mark done/reopen, delete (with confirmation).
- **Dashboard:** open / due-in-7-days / overdue / completed tiles, a 14-day completions chart, open tasks
  by priority, and an "Up next" list (shadcn/ui + Recharts).
- **Offline-first PWA:** installable; the app shell is precached by a service worker. Task data is cached
  in IndexedDB, and changes made offline are queued and replayed on reconnect.
- **Secure by default:** Postgres Row Level Security means each user can only read and write their own rows.
- Light and dark themes, responsive down to phone width.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Vite 8, React 19, TypeScript, React Router 8 |
| UI | Tailwind CSS v4, shadcn/ui (Radix), Recharts, lucide icons |
| Data | TanStack Query (+ IndexedDB persistence), Zod, react-hook-form |
| Backend | Supabase (Postgres, Auth, RLS), no custom server |
| PWA | vite-plugin-pwa (Workbox) |
| Hosting | Vercel |
| Tooling | pnpm workspaces, oxlint, Vitest |

## Project structure

```
apps/web/          The React PWA
packages/shared/   DB types (generated), Zod schemas, pure domain logic
supabase/          config.toml + SQL migrations (schema, RLS, triggers)
docs/              Architecture, data model, decisions, deployment, progress
AGENTS.md          How to work in this repo (for humans and AI agents)
```

## Getting started

### Prerequisites

- Node.js 22+ and pnpm 10+ (`corepack enable` or `npm i -g pnpm`)
- A Supabase project (or run it locally with the Supabase CLI + Docker)
- Optional: Supabase CLI (`brew install supabase/tap/supabase`), Vercel CLI (`npm i -g vercel`)

### 1. Install

```bash
git clone https://github.com/ecv-wilbert/task-management-system.git
cd task-management-system
pnpm install
```

### 2. Set up the database

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push        # applies supabase/migrations
```

### 3. Configure environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in the values from Supabase Dashboard → Project Settings → API Keys:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the **publishable** key (`sb_publishable_…`). Never the secret key |

### 4. Run

```bash
pnpm dev          # http://localhost:5173
```

To test the PWA and offline mode, use the production build: `pnpm build && pnpm preview`
(http://localhost:4173), load the app once, then turn the network off in DevTools.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Typecheck and build for production |
| `pnpm preview` | Serve the production build |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Lint, typecheck, unit tests |
| `pnpm db:new <name>` / `pnpm db:push` / `pnpm db:types` | New migration / apply migrations / regenerate TS types |

## Deployment

Vercel builds from the repo root using `vercel.json` (`pnpm --filter @tms/web build` →
`apps/web/dist`). Pushing to `main` deploys to production. Full steps, including Supabase auth URL
settings, are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [AGENTS.md](AGENTS.md): conventions and workflow for contributors and AI agents
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the pieces fit, offline strategy
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md): tables, triggers, RLS
- [docs/DECISIONS.md](docs/DECISIONS.md): why things are the way they are
- [docs/PROGRESS.md](docs/PROGRESS.md): current status, roadmap, session log
