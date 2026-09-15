-- Harden function execution permissions and constrain anonymous response payloads.
--
-- This migration changes no assessment, participant or response data. It only
-- removes unnecessary RPC execution rights and replaces the public save RPC
-- with the same authorization flow plus input-size validation.

begin;

-- Internal SECURITY DEFINER helpers are invoked by RLS policies or triggers.
-- They must never be callable through the public Data API.
revoke all on function public.can_access_assessment(uuid) from public, anon;
revoke all on function public.can_delete_assessment(uuid) from public, anon;
revoke all on function public.can_edit_assessment(uuid) from public, anon;
revoke all on function public.can_manage_assessment_collaborators(uuid) from public, anon;
revoke all on function public.is_assessment_co_owner(uuid) from public, anon;
revoke all on function public.is_assessment_editor(uuid) from public, anon;
revoke all on function public.is_assessment_owner(uuid) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.is_published_assessment(uuid) from public, anon;
revoke all on function public.handle_auth_user_account() from public, anon, authenticated;
revoke all on function public.handle_new_user_profile() from public, anon, authenticated;
revoke all on function public.prevent_editor_privilege_escalation() from public, anon, authenticated;
revoke all on function public.response_to_json(uuid) from public, anon, authenticated;

-- Authenticated RLS policies still need these predicates while evaluating
-- authorized reads and writes. They remain unavailable to anonymous callers.
grant execute on function public.can_access_assessment(uuid) to authenticated;
grant execute on function public.can_delete_assessment(uuid) to authenticated;
grant execute on function public.can_edit_assessment(uuid) to authenticated;
grant execute on function public.can_manage_assessment_collaborators(uuid) to authenticated;
grant execute on function public.is_assessment_co_owner(uuid) to authenticated;
grant execute on function public.is_assessment_editor(uuid) to authenticated;
grant execute on function public.is_assessment_owner(uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_published_assessment(uuid) to authenticated;

-- Public participant endpoints are deliberately exposed, but only through
-- these token-scoped functions. Revoke the default PUBLIC privilege first.
revoke all on function public.get_public_assessment(text) from public;
revoke all on function public.start_public_response(text, text) from public;
revoke all on function public.save_public_activity_response(text, text, uuid, text, jsonb) from public;
revoke all on function public.submit_public_response(text, text) from public;
grant execute on function public.get_public_assessment(text) to anon, authenticated;
grant execute on function public.start_public_response(text, text) to anon, authenticated;
grant execute on function public.save_public_activity_response(text, text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.submit_public_response(text, text) to anon, authenticated;

create or replace function public.start_public_response(
  target_public_token text,
  target_participant_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assessment_id uuid;
  target_participant_id uuid;
  target_response_id uuid;
begin
  if target_public_token !~ '^[A-Za-z0-9_-]{16,200}$'
    or target_participant_token !~ '^[A-Za-z0-9_-]{16,200}$' then
    raise exception 'Invalid participant session.';
  end if;

  select assessments.id
  into target_assessment_id
  from public.assessments
  where assessments.public_token = target_public_token
    and assessments.status = 'published';

  if target_assessment_id is null then
    raise exception 'Assessment not found or not published.';
  end if;

  insert into public.participants (assessment_id, participant_token, status)
  values (target_assessment_id, target_participant_token, 'started')
  on conflict (assessment_id, participant_token)
  do update set
    participant_token = excluded.participant_token,
    status = 'started',
    submitted_at = null
  returning id into target_participant_id;

  select responses.id
  into target_response_id
  from public.responses
  where responses.assessment_id = target_assessment_id
    and responses.participant_id = target_participant_id
    and responses.status <> 'submitted'
  order by responses.created_at desc
  limit 1;

  if target_response_id is null then
    insert into public.responses (assessment_id, participant_id, status)
    values (target_assessment_id, target_participant_id, 'in_progress')
    returning id into target_response_id;
  end if;

  return public.response_to_json(target_response_id);
end;
$$;

create or replace function public.save_public_activity_response(
  target_public_token text,
  target_participant_token text,
  target_activity_id uuid,
  target_activity_type text,
  target_answer_json jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assessment_id uuid;
  target_participant_id uuid;
  target_response_id uuid;
begin
  if target_public_token !~ '^[A-Za-z0-9_-]{16,200}$'
    or target_participant_token !~ '^[A-Za-z0-9_-]{16,200}$'
    or target_answer_json is null
    or pg_column_size(target_answer_json) > 65536 then
    raise exception 'Invalid public response payload.';
  end if;

  select assessments.id
  into target_assessment_id
  from public.assessments
  where assessments.public_token = target_public_token
    and assessments.status = 'published';

  if target_assessment_id is null then
    raise exception 'Assessment not found or not published.';
  end if;

  select participants.id
  into target_participant_id
  from public.participants
  where participants.assessment_id = target_assessment_id
    and participants.participant_token = target_participant_token;

  if target_participant_id is null then
    raise exception 'Participant session not found.';
  end if;

  select responses.id
  into target_response_id
  from public.responses
  where responses.assessment_id = target_assessment_id
    and responses.participant_id = target_participant_id
    and responses.status <> 'submitted'
  order by responses.created_at desc
  limit 1;

  if target_response_id is null then
    raise exception 'Active response not found.';
  end if;

  if not exists (
    select 1
    from public.activities
    where activities.id = target_activity_id
      and activities.assessment_id = target_assessment_id
      and activities.type = target_activity_type
  ) then
    raise exception 'Activity not found for this assessment.';
  end if;

  insert into public.activity_responses (
    response_id,
    activity_id,
    activity_type,
    answer_json,
    updated_at
  )
  values (
    target_response_id,
    target_activity_id,
    target_activity_type,
    target_answer_json,
    now()
  )
  on conflict (response_id, activity_id)
  do update set
    activity_type = excluded.activity_type,
    answer_json = excluded.answer_json,
    updated_at = now();

  update public.responses
  set updated_at = now()
  where responses.id = target_response_id;

  return public.response_to_json(target_response_id);
end;
$$;

create or replace function public.submit_public_response(
  target_public_token text,
  target_participant_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assessment_id uuid;
  target_participant_id uuid;
  target_response_id uuid;
  submitted_at_value timestamptz := now();
begin
  if target_public_token !~ '^[A-Za-z0-9_-]{16,200}$'
    or target_participant_token !~ '^[A-Za-z0-9_-]{16,200}$' then
    raise exception 'Invalid participant session.';
  end if;

  select assessments.id
  into target_assessment_id
  from public.assessments
  where assessments.public_token = target_public_token
    and assessments.status = 'published';

  if target_assessment_id is null then
    raise exception 'Assessment not found or not published.';
  end if;

  select participants.id
  into target_participant_id
  from public.participants
  where participants.assessment_id = target_assessment_id
    and participants.participant_token = target_participant_token;

  if target_participant_id is null then
    raise exception 'Participant session not found.';
  end if;

  select responses.id
  into target_response_id
  from public.responses
  where responses.assessment_id = target_assessment_id
    and responses.participant_id = target_participant_id
    and responses.status <> 'submitted'
  order by responses.created_at desc
  limit 1;

  if target_response_id is null then
    raise exception 'Active response not found.';
  end if;

  update public.responses
  set status = 'submitted', updated_at = submitted_at_value, submitted_at = submitted_at_value
  where id = target_response_id;

  update public.participants
  set status = 'submitted', submitted_at = submitted_at_value
  where id = target_participant_id;

  return public.response_to_json(target_response_id);
end;
$$;

notify pgrst, 'reload schema';

commit;
