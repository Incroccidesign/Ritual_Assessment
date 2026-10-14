-- A new run preserves the completed run in the immutable archive, then begins
-- directly from activity one. Participants remain in the session and receive
-- the reset through Realtime; their next contribution carries the new run id.
begin;

create or replace function live_internal.restart_live_session(target_session_id uuid, expected_run integer)
returns text language plpgsql security definer set search_path = '' as $$
declare
  s public.live_sessions;
  saved jsonb;
  first_activity uuid;
  stamp timestamptz := clock_timestamp();
begin
  if auth.uid() is null or not public.live_can_edit_session(target_session_id) then
    raise exception 'You cannot restart this session.' using errcode = '42501';
  end if;

  select * into s from public.live_sessions where id = target_session_id for update;
  if s.id is null or s.run_number is distinct from expected_run or s.status not in ('live','intermission','closed') then
    raise exception 'Session changed. Refresh before starting a new run.' using errcode = '40001';
  end if;

  select id into first_activity
  from public.live_activities
  where live_session_id = s.id
  order by order_index
  limit 1;
  if first_activity is null then
    raise exception 'No activities to restart.';
  end if;

  -- Only public report fields are archived: never access tokens or credentials.
  saved := jsonb_build_object(
    'session', to_jsonb(s) - 'owner_id' - 'account_id',
    'activities', coalesce((select jsonb_agg(to_jsonb(a) order by a.order_index) from public.live_activities a where live_session_id = s.id), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(to_jsonb(r)) from public.live_session_roles r where live_session_id = s.id), '[]'::jsonb),
    'participants', coalesce((select jsonb_agg(to_jsonb(p)) from public.live_participants p where live_session_id = s.id), '[]'::jsonb),
    'responses', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.live_responses r where live_session_id = s.id), '[]'::jsonb),
    'priorityItems', coalesce((select jsonb_agg(to_jsonb(i)) from public.live_priority_items i where live_session_id = s.id), '[]'::jsonb),
    'priorityVotes', coalesce((select jsonb_agg(to_jsonb(v)) from public.live_priority_votes v where live_session_id = s.id), '[]'::jsonb),
    'pacts', coalesce((select jsonb_agg(to_jsonb(p)) from public.live_pacts p where live_session_id = s.id), '[]'::jsonb),
    'pactVotes', coalesce((select jsonb_agg(to_jsonb(v)) from public.live_pact_votes v where live_session_id = s.id), '[]'::jsonb)
  );
  insert into public.live_session_runs(live_session_id, run_number, snapshot)
  values (s.id, s.run_number, saved);

  -- Keep configured manual priority items and participants. Everything produced
  -- by the completed run is cleared before activity one is made live again.
  delete from public.live_responses where live_session_id = s.id;
  delete from public.live_priority_votes where live_session_id = s.id;
  delete from public.live_pact_votes where live_session_id = s.id;
  delete from public.live_pacts where live_session_id = s.id;
  delete from public.live_priority_items where live_session_id = s.id and source_type = 'previous_activity';
  update public.live_activities
  set state = 'pending', started_at = null, ended_at = null,
      timer_anchor_at = null, paused_remaining_seconds = null
  where live_session_id = s.id;
  update public.live_activities
  set state = 'live', started_at = stamp, timer_anchor_at = stamp
  where id = first_activity;
  update public.live_sessions
  set status = 'live', run_number = s.run_number + 1,
      ritual_started_at = stamp, ritual_ended_at = null,
      export_docx_count = 0, export_excel_count = 0, error_count = 0
  where id = s.id;

  return 'live';
end;
$$;

revoke all on function live_internal.restart_live_session(uuid, integer) from public, anon;
grant execute on function live_internal.restart_live_session(uuid, integer) to authenticated;
notify pgrst, 'reload schema';
commit;
