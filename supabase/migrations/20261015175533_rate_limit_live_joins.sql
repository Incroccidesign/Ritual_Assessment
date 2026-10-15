-- Public Live joins are processed by a server route using an admin client.
-- Limit attempts durably per session and pseudonymous client address so the
-- protection holds across serverless instances. The table is never exposed to
-- browser roles and rows expire after one day.
begin;

create table public.live_join_rate_limits (
  rate_key_hash text not null check (rate_key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count >= 1),
  updated_at timestamptz not null default now(),
  primary key (rate_key_hash, window_started_at)
);

create index live_join_rate_limits_window_started_at_idx
  on public.live_join_rate_limits (window_started_at);

alter table public.live_join_rate_limits enable row level security;
revoke all on table public.live_join_rate_limits from public, anon, authenticated;

create or replace function public.consume_live_join_rate_limit(target_key_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempt_count integer;
  current_window timestamptz := date_bin('10 minutes', now(), timestamptz '2000-01-01 00:00:00+00');
begin
  if target_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid Live join rate-limit key.';
  end if;

  insert into public.live_join_rate_limits (rate_key_hash, window_started_at)
  values (target_key_hash, current_window)
  on conflict (rate_key_hash, window_started_at) do update
    set attempt_count = public.live_join_rate_limits.attempt_count + 1,
        updated_at = now()
  returning live_join_rate_limits.attempt_count into current_attempt_count;

  delete from public.live_join_rate_limits
  where window_started_at < now() - interval '1 day';

  return current_attempt_count <= 8;
end;
$$;

revoke all on function public.consume_live_join_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_live_join_rate_limit(text) to service_role;

notify pgrst, 'reload schema';
commit;
