# Review call prep

The brief: walk the reviewers through the work, then make a live change while sharing your screen.

## Walkthrough (about 10 minutes)

1. **Live app:** landing page → create an account → dashboard → create, edit, complete and delete a task.
2. **Offline:** DevTools → Network → Offline. Reload (it still opens), add a task, point at
   "1 change will sync". Go back online and show the row in Supabase Table Editor.
3. **Code tour:**
   - `supabase/migrations/*_init_schema.sql`: tables, triggers, RLS policies
   - `apps/web/src/features/tasks/api.ts` → `mutations.ts` → `queries.ts` → `tasks-page.tsx`
     (the layers, and why mutations are registered as defaults)
   - `apps/web/vite.config.ts`: PWA / Workbox config
   - `packages/shared`: generated types + Zod + `computeTaskStats` with tests
4. **Security:** only the publishable key is in the browser; RLS does the enforcement. Show
   `curl` with the publishable key returning `[]`.
5. **Deploy:** `vercel.json`, env vars, push-to-deploy.

## Live change: practice these beforehand

Each one touches every layer and takes 5 to 15 minutes. Follow the checklist in `AGENTS.md`.

### A. Add a "tags" / "category" text field to tasks (DB → types → form → table)
```bash
pnpm db:new add_task_category
# SQL: alter table public.tasks add column category text check (char_length(category) <= 50);
pnpm db:push && pnpm db:types
```
Then add `category` to `taskFormSchema` (packages/shared/src/task.ts), an `<Input>` in
`task-form-dialog.tsx`, the payload in `onSubmit`, and a column in `tasks-page.tsx`.

### B. Add sorting to the tasks table (frontend only)
Add a `sort` state in `tasks-page.tsx` (due date / priority / created) and sort `visible` in the
`useMemo`. Make the column headers buttons.

### C. Add an "Archived" status (enum change)
```sql
alter type public.task_status add value 'archived';
```
Then `pnpm db:types`, add it to `TASK_STATUSES` / `TASK_STATUS_LABEL`, and an icon in `task-badges.tsx`.

### D. Add a stat tile or chart
e.g. "High priority open" tile: add a field in `computeTaskStats` (with a test), render a `StatTile`.

## Likely questions

- *Why no backend server?* RLS enforces ownership in the database, so an API layer would only
  pass requests through. Anything needing secrets would go in an Edge Function (ADR-003).
- *Why not cache API calls in the service worker like the RFID app?* The SW cache is shared across
  accounts on the device; TanStack's cache is cleared on sign-out and also supports offline writes (ADR-004).
- *What happens on conflicting offline edits?* Last write wins; fine for personal lists.
- *Why pnpm monorepo?* One repo, schema and UI change together, shared types (ADR-001).
