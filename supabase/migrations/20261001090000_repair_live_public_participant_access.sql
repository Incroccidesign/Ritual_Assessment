-- Repair Live participant access without widening the public data boundary.
--
-- Live participants use a QR capability token. The original mixed read
-- policies also called authenticated-member helpers for anonymous requests;
-- Postgres may evaluate those helpers before the capability check and reject
-- the request. Keep member and participant paths separate instead.

begin;

-- Existing table, column and function grants are sufficient and unchanged.
-- Separate the same predicates by role; do not grant anonymous callers
-- execution of member-only authorization helpers.

drop policy if exists "Live members and public access read activities" on public.live_activities;
drop policy if exists "Live members and public access read session roles" on public.live_session_roles;
drop policy if exists "Live members or scoped participant read participants" on public.live_participants;
drop policy if exists "Live members or scoped participant read responses" on public.live_responses;
drop policy if exists "Live members and public access read priority items" on public.live_priority_items;
drop policy if exists "Live members or scoped participant read priority votes" on public.live_priority_votes;
drop policy if exists "Live members or scoped participant read pacts" on public.live_pacts;
drop policy if exists "Live members or scoped participant read pact votes" on public.live_pact_votes;

create policy "Live members read activities"
  on public.live_activities for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live members read session roles"
  on public.live_session_roles for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live members read participants"
  on public.live_participants for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live members read responses"
  on public.live_responses for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live members read priority items"
  on public.live_priority_items for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live members read priority votes"
  on public.live_priority_votes for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live members read pacts"
  on public.live_pacts for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live members read pact votes"
  on public.live_pact_votes for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live public access reads activities"
  on public.live_activities for select to anon, authenticated
  using (public.live_has_join_access(live_session_id) or public.live_has_participant_access(live_session_id));

create policy "Live public access reads session roles"
  on public.live_session_roles for select to anon, authenticated
  using (public.live_has_join_access(live_session_id) or public.live_has_participant_access(live_session_id));

create policy "Live participant reads own participant record"
  on public.live_participants for select to anon, authenticated
  using (public.live_is_participant(id));

create policy "Live participant reads own responses"
  on public.live_responses for select to anon, authenticated
  using (public.live_is_participant(participant_id));

create policy "Live public access reads priority items"
  on public.live_priority_items for select to anon, authenticated
  using (public.live_has_join_access(live_session_id) or public.live_has_participant_access(live_session_id));

create policy "Live participant reads own priority votes"
  on public.live_priority_votes for select to anon, authenticated
  using (public.live_is_participant(participant_id));

create policy "Live participant reads pacts"
  on public.live_pacts for select to anon, authenticated
  using (public.live_has_participant_access(live_session_id));

create policy "Live participant reads own pact votes"
  on public.live_pact_votes for select to anon, authenticated
  using (public.live_is_participant(participant_id));

notify pgrst, 'reload schema';

commit;
