-- Live configuration safety
--
-- Activity sequences and participant roles can be edited while a session is
-- being prepared or waiting in the lobby. Once a ritual has started, deleting
-- or replacing an activity could cascade-delete responses, votes and pacts.
-- Keep runtime state transitions available to session editors, but make the
-- destructive configuration path unavailable after the start.

begin;

create or replace function public.live_can_manage_session_configuration(target_live_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_sessions
    where id = target_live_session_id
      and status in ('draft', 'setup', 'lobby')
      and public.live_can_edit_session(id)
  );
$$;

revoke all on function public.live_can_manage_session_configuration(uuid) from public, anon;
grant execute on function public.live_can_manage_session_configuration(uuid) to authenticated;

drop policy if exists "Live members manage activities" on public.live_activities;

create policy "Live members add configuration activities"
  on public.live_activities for insert to authenticated
  with check (public.live_can_manage_session_configuration(live_session_id));

create policy "Live members update activities"
  on public.live_activities for update to authenticated
  using (public.live_can_edit_session(live_session_id))
  with check (public.live_can_edit_session(live_session_id));

create policy "Live members delete pending configuration activities"
  on public.live_activities for delete to authenticated
  using (
    state = 'pending'
    and public.live_can_manage_session_configuration(live_session_id)
  );

drop policy if exists "Live members manage session roles" on public.live_session_roles;

create policy "Live members manage configuration roles"
  on public.live_session_roles for all to authenticated
  using (public.live_can_manage_session_configuration(live_session_id))
  with check (public.live_can_manage_session_configuration(live_session_id));

commit;
