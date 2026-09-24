# Decision log

Short architecture decision records. Add new ones at the bottom; don't rewrite old ones. If a
decision is reversed, add a new entry that supersedes it.

Template:

```
## ADR-NNN: Title
Date: YYYY-MM-DD · Status: accepted | superseded by ADR-XXX
Context: why a decision was needed
Decision: what we chose
Consequences: trade-offs, what it rules out
```

---

## ADR-001: pnpm workspace monorepo
Date: 2026-09-24 · Status: accepted

Context: The brief asks for one GitHub link and one Vercel deploy. Supabase is the backend
(schema, RLS, optionally edge functions), so there's no separate server app.

Decision: One repo with pnpm workspaces: `apps/web`, `packages/shared`, plus a top-level
`supabase/` for migrations.

Consequences: Schema and UI change in the same commit/PR. Types flow from the DB to
`packages/shared` to the app with no publishing step. New apps (e.g. an admin panel) go in `apps/`.

## ADR-002: Vite + React SPA, no SSR
Date: 2026-09-24 · Status: accepted

Context: The app sits behind a login and must work offline as an installable PWA.

Decision: Vite 8 + React 19 + React Router 8 in data-router mode, deployed as static files.

Consequences: No server rendering, so the landing page SEO is basic (meta tags only). The service
worker and offline story are simpler because every route is the same `index.html`.

## ADR-003: Talk to Supabase directly from the browser, secured by RLS
Date: 2026-09-24 · Status: accepted

Context: Simple CRUD over the user's own data.

Decision: Use `supabase-js` with the publishable key. Owner-only RLS on every table. No API layer.

Consequences: Less code and no server to deploy. Any logic that needs secrets or has to be trusted
(third-party API keys, cross-user operations) must go in a Supabase Edge Function or a Vercel
function. Never put a secret in a `VITE_` variable.

## ADR-004: Offline data via TanStack Query persistence, not service-worker API caching
Date: 2026-09-24 · Status: accepted

Context: The reference app (`rfid-pwa-app`) caches `/api/**` in the service worker. Here the
API responses are per-user and authenticated.

Decision: The service worker precaches only the app shell. Task data is cached by TanStack Query,
persisted to IndexedDB, and cleared on sign-out. Offline writes are paused mutations that replay
on reconnect.

Consequences: No cross-account data leaks through a shared SW cache, and offline writes work,
which a read-only SW cache couldn't do. Conflicts are last write wins; that's fine for
single-user task lists and would need revisiting for shared lists.

## ADR-005: shadcn/ui + Recharts for the dashboard
Date: 2026-09-24 · Status: accepted

Decision: shadcn/ui (Radix, `radix-nova` style, Tailwind v4) for components and its `chart`
wrapper over Recharts for charts.

Consequences: The component source lives in `src/components/ui` and belongs to us. Upgrade by
re-adding with the CLI rather than bumping a package.

## ADR-006: Email confirmation off for the demo
Date: 2026-09-24 · Status: accepted (revisit before real users)

Context: Supabase's built-in email sender is rate-limited to a few emails an hour, which reviewers
signing up during a demo could hit.

Decision: `enable_confirmations = false` in `supabase/config.toml`, pushed with `supabase config push`.
The sign-up form still handles the "check your email" case if it's turned back on.

Consequences: Anyone can register with an unverified email. Before real use, configure custom SMTP
and turn confirmations back on.
