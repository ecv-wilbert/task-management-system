# Data model

Source of truth: `supabase/migrations/`. Generated TypeScript types:
`packages/shared/src/database.types.ts` (regenerate with `pnpm db:types`).

```mermaid
erDiagram
  auth_users ||--|| profiles : "1:1 (trigger on sign-up)"
  auth_users ||--o{ tasks : owns
  profiles {
    uuid id PK "= auth.users.id"
    text full_name
    text avatar_url
    timestamptz created_at
    timestamptz updated_at
  }
  tasks {
    uuid id PK "client-generated"
    uuid user_id FK "default auth.uid()"
    text title "1..200 chars"
    text description "<= 5000 chars"
    task_status status "todo | in_progress | done"
    task_priority priority "low | medium | high"
    date due_date
    timestamptz completed_at "set by trigger"
    timestamptz created_at
    timestamptz updated_at "set by trigger"
  }
```

## Behaviour in the database

| Object | What it does |
| --- | --- |
| `handle_new_user()` trigger on `auth.users` | Inserts a `profiles` row using `raw_user_meta_data.full_name` from sign-up |
| `set_updated_at()` trigger | Keeps `updated_at` current on every update |
| `set_task_completed_at()` trigger | Stamps `completed_at` when status becomes `done`, clears it when reopened. Powers the "Completed in the last 14 days" chart |
| Indexes | `(user_id, status)`, `(user_id, due_date)` |

## Row Level Security

RLS is enabled on every table. Policies are for the `authenticated` role only, so anonymous
requests with the publishable key can't read or write anything.

| Table | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| `profiles` | own row | via trigger only | own row | cascade from `auth.users` |
| `tasks` | own rows | `user_id = auth.uid()` | own rows | own rows |

Policies use `(select auth.uid())` rather than `auth.uid()` so Postgres evaluates it once per query,
not once per row (Supabase performance advice).

## Validation

The same limits are enforced twice: as Zod rules in `packages/shared/src/task.ts` (form errors in
the UI) and as `CHECK` constraints in SQL (the real guarantee). If you change one, change both.
