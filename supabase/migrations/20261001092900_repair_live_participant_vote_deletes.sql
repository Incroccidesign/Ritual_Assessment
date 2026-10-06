begin;

drop policy if exists "Live members or scoped participant delete priority votes" on public.live_priority_votes;
drop policy if exists "Live members or scoped participant delete pact votes" on public.live_pact_votes;

create policy "Live members delete priority votes"
  on public.live_priority_votes for delete to authenticated
  using (public.live_can_edit_session(live_session_id));
create policy "Live participant deletes own priority votes"
  on public.live_priority_votes for delete to anon, authenticated
  using (public.live_is_participant(participant_id));

create policy "Live members delete pact votes"
  on public.live_pact_votes for delete to authenticated
  using (public.live_can_edit_session(live_session_id));
create policy "Live participant deletes own pact votes"
  on public.live_pact_votes for delete to anon, authenticated
  using (public.live_is_participant(participant_id));

notify pgrst, 'reload schema';
commit;
