-- Additive deployment: existing data is untouched. A restart archives and resets
-- one authorized session atomically. Archives follow session/account deletion.
begin;

alter table public.live_sessions add column run_number integer not null default 1 check (run_number > 0);
grant select (run_number) on public.live_sessions to anon, authenticated;

create table public.live_session_runs (
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  run_number integer not null check (run_number > 0),
  archived_at timestamptz not null default now(),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  primary key (live_session_id, run_number)
);
alter table public.live_session_runs enable row level security;
revoke all on public.live_session_runs from public, anon, authenticated;
grant select on public.live_session_runs to authenticated;
create policy "Live members read archived runs" on public.live_session_runs
  for select to authenticated using (public.live_can_access_session(live_session_id));

create schema if not exists live_internal;
revoke all on schema live_internal from public, anon;

-- Serialize contribution writes with restarts. Reject stale participant forms
-- after a restart rather than silently adding their old answer to the new run.
create function live_internal.guard_live_run_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid;
  session_run integer;
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  activity public.live_activities;
  configured jsonb;
begin
  sid := case when tg_op = 'DELETE' then old.live_session_id else new.live_session_id end;
  select run_number into session_run from public.live_sessions where id = sid for share;
  if headers ? 'x-live-participant-id' and
     ((headers ->> 'x-live-run-number') is distinct from session_run::text) and
     (session_run > 1 or headers ? 'x-live-run-number') then
    raise exception 'This session has restarted. Wait for the current activity and try again.' using errcode = '40001';
  end if;
  if tg_table_name = 'live_responses' and tg_op <> 'DELETE' then
    select * into activity from public.live_activities where id = new.live_activity_id and live_session_id = sid;
    if activity.activity_type is distinct from new.activity_type then
      raise exception 'Activity type does not match.' using errcode = '23514';
    end if;
    if activity.activity_type = 'traccia' then
      configured := coalesce(activity.surface_input_types, '[]'::jsonb);
      if not exists (select 1 from jsonb_array_elements(configured) c where coalesce(c->>'id', '') <> '') then
        configured := '[{"id":"issues"},{"id":"barriers"},{"id":"opportunities"},{"id":"signals"}]'::jsonb;
      end if;
      if new.response_category is null or not exists (
        select 1 from jsonb_array_elements(configured) c where c->>'id' = new.response_category
      ) then
        raise exception 'Select a category before submitting your response.' using errcode = '23514';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function live_internal.guard_live_run_write() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['live_responses','live_priority_votes','live_pact_votes','live_pacts','live_priority_items'] loop
    execute format('create trigger guard_live_run_write before insert or update or delete on public.%I for each row execute function live_internal.guard_live_run_write()', t);
  end loop;
end;
$$;

-- The private function is privileged only so the immutable archive and runtime
-- reset can be committed together; authorization is checked before any writes.
create function live_internal.restart_live_session(target_session_id uuid, expected_run integer)
returns text language plpgsql security definer set search_path = '' as $$
declare
  s public.live_sessions;
  saved jsonb;
  next_status text;
  first_activity uuid;
  stamp timestamptz := clock_timestamp();
begin
  if auth.uid() is null or not public.live_can_edit_session(target_session_id) then
    raise exception 'You cannot restart this session.' using errcode = '42501';
  end if;
  select * into s from public.live_sessions where id = target_session_id for update;
  if s.id is null or s.run_number is distinct from expected_run or s.status not in ('live','intermission','closed') then
    raise exception 'Session changed. Refresh before restarting.' using errcode = '40001';
  end if;
  select id into first_activity from public.live_activities where live_session_id = s.id order by order_index limit 1;
  if first_activity is null then raise exception 'No activities to restart.'; end if;
  -- Only public report fields are archived: never access tokens or credentials.
  saved := jsonb_build_object(
    'session', to_jsonb(s) - 'owner_id' - 'account_id',
    'activities', coalesce((select jsonb_agg(to_jsonb(a) order by a.order_index) from public.live_activities a where live_session_id=s.id),'[]'::jsonb),
    'roles', coalesce((select jsonb_agg(to_jsonb(r)) from public.live_session_roles r where live_session_id=s.id),'[]'::jsonb),
    'participants', coalesce((select jsonb_agg(to_jsonb(p)) from public.live_participants p where live_session_id=s.id),'[]'::jsonb),
    'responses', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.live_responses r where live_session_id=s.id),'[]'::jsonb),
    'priorityItems', coalesce((select jsonb_agg(to_jsonb(i)) from public.live_priority_items i where live_session_id=s.id),'[]'::jsonb),
    'priorityVotes', coalesce((select jsonb_agg(to_jsonb(v)) from public.live_priority_votes v where live_session_id=s.id),'[]'::jsonb),
    'pacts', coalesce((select jsonb_agg(to_jsonb(p)) from public.live_pacts p where live_session_id=s.id),'[]'::jsonb),
    'pactVotes', coalesce((select jsonb_agg(to_jsonb(v)) from public.live_pact_votes v where live_session_id=s.id),'[]'::jsonb)
  );
  insert into public.live_session_runs(live_session_id,run_number,snapshot) values(s.id,s.run_number,saved);
  delete from public.live_responses where live_session_id=s.id;
  delete from public.live_priority_votes where live_session_id=s.id;
  delete from public.live_pact_votes where live_session_id=s.id;
  delete from public.live_pacts where live_session_id=s.id;
  delete from public.live_priority_items where live_session_id=s.id and source_type='previous_activity';
  update public.live_activities set state='pending',started_at=null,ended_at=null,timer_anchor_at=null,paused_remaining_seconds=null where live_session_id=s.id;
  next_status := case when s.status='closed' then 'lobby' else 'live' end;
  if next_status='live' then
    update public.live_activities set state='live',started_at=stamp,timer_anchor_at=stamp where id=first_activity;
  end if;
  update public.live_sessions set status=next_status,run_number=s.run_number+1,
    ritual_started_at=case when next_status='live' then stamp else null end,
    ritual_ended_at=null,export_docx_count=0,export_excel_count=0,error_count=0 where id=s.id;
  return next_status;
end;
$$;
revoke all on function live_internal.restart_live_session(uuid,integer) from public, anon;
grant execute on function live_internal.restart_live_session(uuid,integer) to authenticated;

create function public.restart_live_session(target_session_id uuid, expected_run integer)
returns text language sql security definer set search_path = '' as $$
  select live_internal.restart_live_session(target_session_id, expected_run);
$$;
revoke all on function public.restart_live_session(uuid,integer) from public, anon;
grant execute on function public.restart_live_session(uuid,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
