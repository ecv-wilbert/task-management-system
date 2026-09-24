-- Rate limits for the Punchy assistant (supabase/functions/punchy).
-- Fixed-window counters keyed by bucket, e.g. 'user:<uuid>', 'ip:<sha256>',
-- 'global:landing'. Only the Edge Function (service role) reads or writes this.
-- Unlike tasks, rows have no owner, so RLS is on with no policies: anon and
-- authenticated users can't touch the table at all.

create table public.punchy_usage (
  bucket        text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (bucket, window_start)
);

create index punchy_usage_window_start_idx on public.punchy_usage (window_start);

alter table public.punchy_usage enable row level security;
revoke all on table public.punchy_usage from anon, authenticated;

-- Counts one request against a bucket and says whether it's within the limit.
-- Atomic (single upsert), so parallel requests can't slip past the limit.
create or replace function public.punchy_take_quota(p_bucket text, p_window_seconds integer, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.punchy_usage as u (bucket, window_start, count)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket, window_start) do update set count = u.count + 1
  returning u.count into v_count;

  -- Opportunistic cleanup keeps the table small without a cron job.
  if random() < 0.01 then
    delete from public.punchy_usage where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.punchy_take_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function public.punchy_take_quota(text, integer, integer) to service_role;
