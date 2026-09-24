-- Duplicate-email check for the sign-up form (supabase/functions/check-email).
-- auth.users already enforces unique emails; this lets the form say so before
-- the user submits. Only the service role can call it, and the Edge Function
-- rate-limits callers, because "is this email registered?" reveals accounts.

create or replace function public.email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(trim(p_email))
  );
$$;

revoke execute on function public.email_registered(text) from public, anon, authenticated;
grant execute on function public.email_registered(text) to service_role;
