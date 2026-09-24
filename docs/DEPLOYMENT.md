# Deployment

## Current setup

| Piece | Value |
| --- | --- |
| Production URL | https://task-management-system-two-puce.vercel.app |
| Vercel project | `unknownviis-projects/task-management-system` |
| Supabase project | `task-management-system`, ref `dmwmeefalvjmazlgzprp`, region `ap-southeast-1` |
| GitHub | https://github.com/ecv-wilbert/task-management-system (branch `main` → production) |

## How a deploy works

1. Push to `main` (or open a PR for a preview deploy).
2. Vercel runs `pnpm install --frozen-lockfile` then `pnpm --filter @tms/web build` from the repo
   root (see `vercel.json`) and serves `apps/web/dist`.
3. `vercel.json` rewrites any path without a file extension to `/index.html` (SPA routing), serves
   `/sw.js` with `max-age=0` so browsers pick up new service workers, and caches hashed `/assets/*`
   forever.
4. Users with the app open get a "A new version is available · Reload" toast.

Edge Functions (`punchy`, `check-email`) are **not** deployed by Vercel either. After changing
anything under `supabase/functions/` or `packages/shared/src/{punchy,account}.ts`, run
`pnpm fn:deploy` (`supabase functions deploy --use-api`, deploys all functions, no Docker needed).

Database migrations are **not** applied by Vercel. Run `pnpm db:push` yourself before (or with)
deploying code that depends on a schema change. Migrations should be backward compatible with the
currently deployed frontend.

Manual deploy from a laptop: `npx vercel deploy --prod` (linked via `.vercel/`, which is gitignored).

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Environments | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Production, Preview, Development | `https://dmwmeefalvjmazlgzprp.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development | Publishable key. Public by design; RLS protects the data |

`VITE_` variables are compiled into the JS bundle, so never put a secret in one.

## Supabase auth settings

Managed in `supabase/config.toml` and applied with `supabase config push`:

- `site_url`: the production URL
- `additional_redirect_urls`: localhost dev/preview, production, and Vercel preview deploys
  (`https://task-management-system-*-unknownviis-projects.vercel.app/**`)
- `auth.email.enable_confirmations = false` (see ADR-006), `minimum_password_length = 8`,
  `password_requirements = "lower_upper_letters_digits"`
- Passkeys (`[auth.passkey]`, `[auth.webauthn]`): set via the Management API or Dashboard, see [AUTH.md](AUTH.md)

If the production domain changes, update `site_url` and the redirect list, then `supabase config push`.

> `supabase config push` sends every declared setting, not just the ones you edited. Run
> `supabase config diff` first and check nothing unexpected changes. The drift found on 2026-09-24
> (Twilio SMS, pooler sizes) is reconciled, so the diff should show only your edits. Passkey settings
> are not managed by `config push`; see [AUTH.md](AUTH.md).

## Setting up from scratch (new Supabase + Vercel accounts)

```bash
# Supabase
supabase login
supabase projects create task-management-system --org-id <org> --region ap-southeast-1 --db-password <pw>
supabase link --project-ref <ref>
supabase db push
# edit site_url / additional_redirect_urls in supabase/config.toml, then:
supabase config push
supabase secrets set GEMINI_API_KEY=<key>
supabase functions deploy --use-api
# enable passkeys for the new domain: Dashboard → Authentication → Passkeys (see docs/AUTH.md)

# Vercel
npx vercel link --project task-management-system
npx vercel env add VITE_SUPABASE_URL production --value https://<ref>.supabase.co
npx vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production --value sb_publishable_...
# (repeat env add for preview and development)
npx vercel git connect https://github.com/<owner>/task-management-system
npx vercel deploy --prod
```

## Secrets that are NOT in the repo

| Secret | Where it lives |
| --- | --- |
| Database password | `.secrets.local` on the original machine (gitignored) and your password manager. Reset in Supabase Dashboard → Database settings if lost |
| Supabase secret key | Supabase Dashboard only. The Edge Function gets the service role key injected automatically |
| `GEMINI_API_KEY` | Supabase secrets (`supabase secrets set`), used by the `punchy` function. Same key as adaptive-routine |
| `PUNCHY_ALLOWED_ORIGINS` (optional) | Supabase secrets. Extra comma-separated origins allowed to call the Edge Functions (e.g. a new domain) |
