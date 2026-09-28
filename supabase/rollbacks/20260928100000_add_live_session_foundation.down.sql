-- MANUAL ROLLBACK ONLY — do not run after Live Sessions contain data that
-- must be retained. This script is deliberately outside supabase/migrations
-- so that Supabase CLI will never execute it automatically.

begin;

alter publication supabase_realtime drop table if exists public.live_pact_votes;
alter publication supabase_realtime drop table if exists public.live_pacts;
alter publication supabase_realtime drop table if exists public.live_priority_votes;
alter publication supabase_realtime drop table if exists public.live_priority_items;
alter publication supabase_realtime drop table if exists public.live_responses;
alter publication supabase_realtime drop table if exists public.live_participants;
alter publication supabase_realtime drop table if exists public.live_session_roles;
alter publication supabase_realtime drop table if exists public.live_activities;
alter publication supabase_realtime drop table if exists public.live_sessions;

drop function if exists public.live_join_session(uuid, text, text, text, text, text, text, text, text, text);
drop function if exists public.live_has_participant_access(uuid);
drop function if exists public.live_is_participant(uuid);
drop function if exists public.live_has_join_access(uuid);
drop function if exists public.live_request_participant_id();
drop function if exists public.live_token_hash(text);
drop function if exists public.live_request_header(text);
drop function if exists public.live_can_delete_session(uuid);
drop function if exists public.live_can_manage_collaborators(uuid);
drop function if exists public.live_can_edit_session(uuid);
drop function if exists public.live_can_access_session(uuid);
drop function if exists public.live_is_session_co_owner(uuid);
drop function if exists public.live_is_session_editor(uuid);
drop function if exists public.live_touch_updated_at();
drop function if exists public.live_enforce_account_owner();
drop function if exists public.live_current_account_id();

drop table if exists public.live_participant_tokens;
drop table if exists public.live_session_access_tokens;
drop table if exists public.live_pact_votes;
drop table if exists public.live_pacts;
drop table if exists public.live_priority_votes;
drop table if exists public.live_priority_items;
drop table if exists public.live_responses;
drop table if exists public.live_participants;
drop table if exists public.live_session_roles;
drop table if exists public.live_activities;
drop table if exists public.live_session_collaborators;
drop table if exists public.live_sessions;

commit;
