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

## ADR-007: Punchy runs in a Supabase Edge Function calling Gemini
Date: 2026-09-24 · Status: accepted

Context: An in-app and landing-page assistant needs an LLM API key, which can't go to the browser
(ADR-003). The adaptive-routine project already uses Gemini with structured JSON output.

Decision: One Edge Function (`supabase/functions/punchy`) with `verify_jwt = false` so anonymous
landing visitors can use it; it verifies the JWT itself for in-app requests and reads tasks as the
user so RLS still applies. Gemini (`gemini-3.5-flash-lite`, falling back to `gemini-flash-latest`)
returns JSON against a schema. The contract, prompt and sanitisers live in
`packages/shared/src/punchy.ts` with no imports so both the web app and the Deno function use the
same code. Punchy can only suggest actions from a per-surface allow-list; task creation goes through
the normal form for the user to confirm. The chat request uses `useMutation` with
`networkMode: 'always'` and is not registered as a mutation default: it's a read-only question that
must never be queued offline and replayed.

Consequences: No Vercel functions to manage and the key stays in Supabase secrets. Punchy needs a
connection. Changes to `punchy.ts` need `pnpm fn:deploy` as well as a web deploy. Task titles and
notes (trimmed) go to Google as a processor.

## ADR-008: Rate limits in Postgres, in a table with no owner
Date: 2026-09-24 · Status: accepted

Context: The landing-page assistant is public, so the Gemini key needs abuse protection. Edge
Function memory isn't shared between instances.

Decision: Fixed-window counters in `punchy_usage`, updated atomically by `punchy_take_quota()`.
Per user (30/10 min), per HMAC-hashed IP (10/10 min) and a global anonymous cap (1000/day). The
table is an exception to AGENTS.md rule 2 (owner-only RLS): it has no owner, so RLS is on with no
policies and only the service role can use it. Fail closed on errors.

Consequences: One extra DB round trip per message. Raw IPs are never stored.

## ADR-009: Passkeys bound to the current production domain
Date: 2026-09-24 · Status: accepted

Context: Users want Face ID / Touch ID / fingerprint sign-in on iOS, Android and desktop.
supabase-js 2.117 supports passkeys natively. A passkey is tied to one RP ID (host).

Decision: Enable Supabase passkeys with RP ID `task-management-system-two-puce.vercel.app` (the
current URL, by owner's choice). Passwords stay as the fallback. Enabled through the Management API
because `supabase config push` (CLI 2.117) doesn't manage passkey settings; `config.toml` mirrors the
values. Passkey calls are online-only (`networkMode: 'always'`), not queued like task writes.

Consequences: Renaming the domain later orphans existing passkeys. Passkeys can't be tested on
localhost or preview deploys. To reconcile the config drift found while doing this, `config.toml`
now matches the live pooler sizes and leaves the Twilio block undeclared.

## ADR-010: Duplicate-email check before sign-up
Date: 2026-09-24 · Status: accepted (revisit if email confirmation is turned on)

Context: The sign-up form should say an email is taken before the user submits.

Decision: A `check-email` Edge Function validates and normalises the email and calls
`email_registered()` (service role only). Rate limited to 20 checks / 10 min per HMAC-hashed IP.
The form also maps Supabase's `user_already_exists` error to the same message, and falls back to it
if the check can't run.

Consequences: The endpoint confirms whether an address has an account (enumeration). With email
confirmation off, sign-up already reveals that, so the risk doesn't grow much; with confirmation
on, Supabase hides it, and this check should be removed or made much stricter.

## ADR-011: SEO for a client-rendered SPA without SSR
Date: 2026-09-24 · Status: accepted

Context: The landing page should rank and share well, but the app is a Vite SPA (ADR-002).

Decision: Put everything crawlers and link previews need in the static `index.html` (title,
description, canonical, Open Graph/Twitter card with a 1200×630 image, `WebApplication` JSON-LD,
`<noscript>` summary), add `robots.txt` + `sitemap.xml`, set per-page titles with `usePageMeta`,
and mark sign-in, the app and error pages `noindex` both in the page and with an `X-Robots-Tag`
header from Vercel. The landing page gained a FAQ for real, crawlable text.

Consequences: Google (which renders JS) sees everything; link-preview bots see the static tags.
If rankings matter more later, prerender the landing page at build time rather than moving to SSR.

## ADR-012: Punchy limits by device, browser signature, IP and account, with a traffic log
Date: 2026-09-24 · Status: accepted

Context: IP-only limits are too coarse (whole offices share one IP) and easy to dodge with new
accounts; per-account limits can be multiplied by signing up again.

Decision: Layered buckets: a random device ID kept in localStorage, a coarse browser signature
paired with the IP (so private windows and cleared storage don't reset limits, while the same phone
model on another network isn't affected), the IP, and the account. Signed-in use is also capped at
3 accounts per device (or signature + network) and 10 per IP per day. One `punchy_guard()` call
checks, counts and logs each request. Logs and review views live in a `private` schema; identifiers
are HMAC-hashed with a server secret; 30-day retention.

Consequences: Client signals can be faked, so they only add limits, never relax the IP ones.
Families or offices sharing one device may hit the account cap. The browser signature is a mild
form of fingerprinting: coarse traits, hashed twice, used only for fair-use limits, disclosed in
Punchy's product guide. Tune in `LIMITS` (`guard.ts`) and redeploy.
