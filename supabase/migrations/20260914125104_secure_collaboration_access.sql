-- Secure collaboration access (additive permissions migration)
--
-- This migration changes no existing assessment, activity, participant,
-- response or activity_response rows. It introduces permission helpers and
-- policies, plus a token-scoped RPC for the public participant read path.
-- Apply only after backup restore validation.

begin;

-- Keep a workspace record in sync for future Auth users. Existing workspaces
-- were already created by the reviewed backfill migration and are not changed.
create or replace function public.handle_auth_user_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (owner_user_id, name, status)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'organization_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Ritual account'
    ),
    case when new.email_confirmed_at is null then 'pending_verification' else 'active' end
  )
  on conflict (owner_user_id) do update
  set status = case
    when public.accounts.status = 'pending_verification'
      and new.email_confirmed_at is not null then 'active'
    else public.accounts.status
  end,
  updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_account_changed on auth.users;
create trigger on_auth_user_account_changed
  after insert or update of email_confirmed_at on auth.users
  for each row execute procedure public.handle_auth_user_account();

-- These functions are only usable by authenticated database requests and are
-- used by RLS. They never use browser-editable metadata to make a decision.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_assessment_editor(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessment_collaborators
    where assessment_id = target_assessment_id
      and user_id = auth.uid()
      and role = 'editor'
  );
$$;

create or replace function public.can_access_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessments
    where id = target_assessment_id
      and (
        owner_id = auth.uid()
        or public.is_assessment_editor(id)
        or public.is_platform_admin()
      )
  );
$$;

create or replace function public.can_edit_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessments
    where id = target_assessment_id
      and (
        owner_id = auth.uid()
        or public.is_assessment_editor(id)
      )
  );
$$;

-- An editor can work on content, but cannot seize ownership or move an
-- assessment to another account/version lineage through a direct update.
create or replace function public.prevent_editor_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and auth.uid() <> old.owner_id
    and not public.is_platform_admin()
    and (
      new.owner_id is distinct from old.owner_id
      or new.account_id is distinct from old.account_id
      or new.version_root_id is distinct from old.version_root_id
      or new.supersedes_assessment_id is distinct from old.supersedes_assessment_id
      or new.version_number is distinct from old.version_number
      or new.retention_expires_at is distinct from old.retention_expires_at
      or new.retention_exception_until is distinct from old.retention_exception_until
    ) then
    raise exception 'Editors cannot change assessment ownership, account, version or retention.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_editor_privilege_escalation on public.assessments;
create trigger prevent_editor_privilege_escalation
  before update on public.assessments
  for each row execute procedure public.prevent_editor_privilege_escalation();

-- Public assessments must be read through this token-scoped function. A
-- generic published-row SELECT policy would allow an anonymous caller to read
-- every published assessment, regardless of the token it supplied.
create or replace function public.get_public_assessment(target_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_row public.assessments%rowtype;
begin
  if target_public_token is null or char_length(target_public_token) < 16 or char_length(target_public_token) > 200 then
    return null;
  end if;

  select *
  into assessment_row
  from public.assessments
  where public_token = target_public_token
    and status = 'published'
  limit 1;

  if assessment_row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', assessment_row.id,
    'owner_id', '',
    'title', assessment_row.title,
    'description', assessment_row.description,
    'estimated_duration', assessment_row.estimated_duration,
    'hide_activity_summaries', assessment_row.hide_activity_summaries,
    'language', assessment_row.language,
    'status', assessment_row.status,
    'public_token', assessment_row.public_token,
    'created_at', assessment_row.created_at,
    'updated_at', assessment_row.updated_at,
    'published_at', assessment_row.published_at,
    'activities', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', activity.id,
            'assessment_id', activity.assessment_id,
            'type', activity.type,
            'title', activity.title,
            'prompt', activity.prompt,
            'order_index', activity.order_index,
            'config_json', activity.config_json,
            'created_at', activity.created_at,
            'updated_at', activity.updated_at
          ) order by activity.order_index
        )
        from public.activities activity
        where activity.assessment_id = assessment_row.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

-- Existing public response RPCs retain their narrow token-bound contract. The
-- submitted activity type is now checked against the persisted activity row.
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
set search_path = public
as $$
declare
  target_assessment_id uuid;
  target_participant_id uuid;
  target_response_id uuid;
begin
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
    where id = target_activity_id
      and assessment_id = target_assessment_id
      and type = target_activity_type
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

-- Replace owner-only and broad public policies with explicit member policies.
drop policy if exists "Designers create own assessments" on public.assessments;
drop policy if exists "Designers read own assessments" on public.assessments;
drop policy if exists "Designers update own assessments" on public.assessments;
drop policy if exists "Designers delete own assessments" on public.assessments;
drop policy if exists "Published assessments are readable by public token" on public.assessments;

create policy "Members read accessible assessments"
  on public.assessments for select to authenticated
  using (public.can_access_assessment(id));

create policy "Owners create assessments"
  on public.assessments for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Members update accessible assessments"
  on public.assessments for update to authenticated
  using (public.can_edit_assessment(id))
  with check (public.can_edit_assessment(id));

create policy "Owners delete assessments"
  on public.assessments for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Designers insert own activities" on public.activities;
drop policy if exists "Designers read own activities" on public.activities;
drop policy if exists "Designers update own activities" on public.activities;
drop policy if exists "Designers delete own activities" on public.activities;
drop policy if exists "Published activities are readable through assessment" on public.activities;

create policy "Members read accessible activities"
  on public.activities for select to authenticated
  using (public.can_access_assessment(assessment_id));

create policy "Members insert editable activities"
  on public.activities for insert to authenticated
  with check (public.can_edit_assessment(assessment_id));

create policy "Members update editable activities"
  on public.activities for update to authenticated
  using (public.can_edit_assessment(assessment_id))
  with check (public.can_edit_assessment(assessment_id));

create policy "Members delete editable activities"
  on public.activities for delete to authenticated
  using (public.can_edit_assessment(assessment_id));

drop policy if exists "Designers read participants for own assessments" on public.participants;
drop policy if exists "Designers read responses for own assessments" on public.responses;
drop policy if exists "Designers read activity responses for own assessments" on public.activity_responses;

create policy "Members read accessible participants"
  on public.participants for select to authenticated
  using (public.can_access_assessment(assessment_id));

create policy "Members read accessible responses"
  on public.responses for select to authenticated
  using (public.can_access_assessment(assessment_id));

create policy "Members read accessible activity responses"
  on public.activity_responses for select to authenticated
  using (
    public.can_access_assessment(
      (select responses.assessment_id from public.responses where responses.id = response_id)
    )
  );

-- Limit direct execution of helpers and explicitly expose only the intended
-- public endpoints.
revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_assessment_editor(uuid) from public;
revoke all on function public.can_access_assessment(uuid) from public;
revoke all on function public.can_edit_assessment(uuid) from public;
revoke all on function public.is_assessment_owner(uuid) from public;
revoke all on function public.is_published_assessment(uuid) from public;
revoke all on function public.response_to_json(uuid) from public;
revoke all on function public.get_public_assessment(text) from public;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_assessment_editor(uuid) to authenticated;
grant execute on function public.can_access_assessment(uuid) to authenticated;
grant execute on function public.can_edit_assessment(uuid) to authenticated;
grant execute on function public.is_assessment_owner(uuid) to authenticated;
grant execute on function public.get_public_assessment(text) to anon, authenticated;
grant execute on function public.start_public_response(text, text) to anon, authenticated;
grant execute on function public.save_public_activity_response(text, text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.submit_public_response(text, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
