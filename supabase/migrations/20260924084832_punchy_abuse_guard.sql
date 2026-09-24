-- Abuse guard for the Punchy assistant: layered rate limits (account, device,
-- browser signature + network, IP, global), a multi-account check, and an event
-- log for reviewing traffic. See docs/PUNCHY.md and ADR-012.
--
-- Everything lives in the `private` schema, which the API does not expose.
-- Identifiers arrive already HMAC-hashed by the Edge Function; no raw IPs,
-- device IDs or user agents are stored.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- ---------------------------------------------------------------------------
-- Event log: one row per Punchy request, allowed or not.
-- ---------------------------------------------------------------------------
create table private.punchy_events (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  surface      text not null check (surface in ('landing', 'app')),
  user_id      uuid references auth.users (id) on delete set null,
  device_hash  text,          -- HMAC of the browser's stored device id
  fpip_hash    text,          -- HMAC of browser signature + IP (survives private windows)
  ip_hash      text not null, -- HMAC of the IP
  browser      text,          -- coarse family, e.g. "Chrome"
  os           text,          -- coarse family, e.g. "iOS"
  outcome      text not null  -- 'ok' or the reason it was refused, e.g. 'quota:device', 'accounts:device'
);

create index punchy_events_created_at_idx on private.punchy_events (created_at);
create index punchy_events_device_idx on private.punchy_events (device_hash, created_at) where device_hash is not null;
create index punchy_events_fpip_idx on private.punchy_events (fpip_hash, created_at) where fpip_hash is not null;
create index punchy_events_ip_idx on private.punchy_events (ip_hash, created_at);
create index punchy_events_user_idx on private.punchy_events (user_id, created_at) where user_id is not null;

alter table private.punchy_events enable row level security;
revoke all on table private.punchy_events from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- punchy_guard: decide whether a request may go ahead, count it, log it.
-- Returns null when allowed, otherwise a reason code. One round trip.
--
-- p_quotas: [{ "bucket": "device:<hash>", "window": 600, "limit": 10 }, ...]
--   checked in order; the first bucket over its limit refuses the request.
-- Multi-account check (signed-in only): how many *other* accounts used Punchy
--   successfully from this device / browser+network / IP in the last 24 hours.
-- ---------------------------------------------------------------------------
create or replace function public.punchy_guard(
  p_surface text,
  p_user_id uuid,
  p_ip_hash text,
  p_device_hash text,
  p_fpip_hash text,
  p_browser text,
  p_os text,
  p_quotas jsonb,
  p_max_other_accounts_per_device integer,
  p_max_other_accounts_per_ip integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_others integer;
  q jsonb;
begin
  if p_user_id is not null then
    select count(distinct e.user_id) into v_others
    from private.punchy_events e
    where e.outcome = 'ok'
      and e.created_at > now() - interval '1 day'
      and e.user_id is not null
      and e.user_id <> p_user_id
      and ((p_device_hash is not null and e.device_hash = p_device_hash)
        or (p_fpip_hash is not null and e.fpip_hash = p_fpip_hash));
    if v_others >= p_max_other_accounts_per_device then
      v_reason := 'accounts:device';
    end if;

    if v_reason is null then
      select count(distinct e.user_id) into v_others
      from private.punchy_events e
      where e.outcome = 'ok'
        and e.created_at > now() - interval '1 day'
        and e.user_id is not null
        and e.user_id <> p_user_id
        and e.ip_hash = p_ip_hash;
      if v_others >= p_max_other_accounts_per_ip then
        v_reason := 'accounts:ip';
      end if;
    end if;
  end if;

  if v_reason is null then
    for q in select value from jsonb_array_elements(p_quotas) loop
      if not public.punchy_take_quota(q ->> 'bucket', (q ->> 'window')::integer, (q ->> 'limit')::integer) then
        v_reason := 'quota:' || split_part(q ->> 'bucket', ':', 1);
        exit;
      end if;
    end loop;
  end if;

  insert into private.punchy_events (surface, user_id, device_hash, fpip_hash, ip_hash, browser, os, outcome)
  values (p_surface, p_user_id, p_device_hash, p_fpip_hash, p_ip_hash, left(p_browser, 40), left(p_os, 40),
          coalesce(v_reason, 'ok'));

  -- Keep 30 days of history without a cron job.
  if random() < 0.01 then
    delete from private.punchy_events where created_at < now() - interval '30 days';
  end if;

  return v_reason;
end;
$$;

revoke execute on function public.punchy_guard(text, uuid, text, text, text, text, text, jsonb, integer, integer)
  from public, anon, authenticated;
grant execute on function public.punchy_guard(text, uuid, text, text, text, text, text, jsonb, integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Review views (SQL editor / Table editor → schema "private"). Last 7 days.
-- ---------------------------------------------------------------------------

-- Devices (or browser+network pairs) used by more than one account, or refused a lot.
create view private.punchy_suspicious_devices as
select
  coalesce(device_hash, 'fpip:' || fpip_hash) as device,
  count(*)                                          as requests,
  count(*) filter (where outcome <> 'ok')           as refused,
  count(distinct user_id)                           as accounts,
  count(distinct ip_hash)                           as networks,
  string_agg(distinct browser || ' / ' || os, ', ') as browsers,
  max(created_at)                                   as last_seen
from private.punchy_events
where created_at > now() - interval '7 days'
group by 1
having count(distinct user_id) > 1 or count(*) filter (where outcome <> 'ok') > 0
order by accounts desc, refused desc;

-- Per-account traffic, with the email for follow-up.
create view private.punchy_user_activity as
select
  e.user_id,
  u.email,
  count(*)                                   as requests,
  count(*) filter (where e.outcome <> 'ok')  as refused,
  count(distinct e.device_hash)              as devices,
  count(distinct e.ip_hash)                  as networks,
  min(e.created_at)                          as first_seen,
  max(e.created_at)                          as last_seen
from private.punchy_events e
join auth.users u on u.id = e.user_id
where e.created_at > now() - interval '7 days'
group by e.user_id, u.email
order by requests desc;

-- Daily traffic by surface and outcome.
create view private.punchy_daily_traffic as
select
  date_trunc('day', created_at)::date as day,
  surface,
  outcome,
  count(*)                            as requests,
  count(distinct coalesce(device_hash, fpip_hash, ip_hash)) as clients
from private.punchy_events
where created_at > now() - interval '30 days'
group by 1, 2, 3
order by 1 desc, 2, 4 desc;

revoke all on private.punchy_suspicious_devices, private.punchy_user_activity, private.punchy_daily_traffic
  from public, anon, authenticated;
