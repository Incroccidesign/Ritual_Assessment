create extension if not exists "pgcrypto" with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text,
  estimated_duration text,
  language text not null default 'en' check (language in ('en', 'fr', 'it', 'ar')),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  public_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.assessments
  add column if not exists estimated_duration text;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  type text not null check (type in ('profiling', 'exploration', 'prioritization', 'framing', 'planning_report')),
  title text not null,
  prompt text not null,
  order_index integer not null,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  participant_token text,
  status text not null default 'started' check (status in ('started', 'submitted', 'abandoned')),
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists public.activity_responses (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  activity_type text not null check (activity_type in ('profiling', 'exploration', 'prioritization', 'framing', 'planning_report')),
  answer_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (response_id, activity_id)
);

create index if not exists assessments_owner_id_idx on public.assessments(owner_id);
create index if not exists assessments_public_token_idx on public.assessments(public_token);
create index if not exists activities_assessment_id_idx on public.activities(assessment_id);
create index if not exists participants_assessment_id_idx on public.participants(assessment_id);
drop index if exists public.participants_assessment_token_idx;
create unique index if not exists participants_assessment_token_unique_idx
  on public.participants(assessment_id, participant_token);
create index if not exists responses_assessment_id_idx on public.responses(assessment_id);
create index if not exists responses_participant_id_idx on public.responses(participant_id);
create index if not exists activity_responses_response_id_idx on public.activity_responses(response_id);
create index if not exists activity_responses_activity_id_idx on public.activity_responses(activity_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

create or replace function public.is_assessment_owner(target_assessment_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessments
    where id = target_assessment_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.is_published_assessment(target_assessment_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assessments
    where id = target_assessment_id
      and status = 'published'
      and public_token is not null
  );
$$;

create or replace function public.response_to_json(target_response_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', responses.id,
    'assessmentId', responses.assessment_id,
    'participantId', responses.participant_id,
    'status', responses.status,
    'createdAt', responses.created_at,
    'updatedAt', responses.updated_at,
    'submittedAt', responses.submitted_at,
    'activityResponses',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', activity_responses.id,
              'responseId', activity_responses.response_id,
              'activityId', activity_responses.activity_id,
              'activityType', activity_responses.activity_type,
              'answer', activity_responses.answer_json,
              'createdAt', activity_responses.created_at,
              'updatedAt', activity_responses.updated_at
            )
            order by activity_responses.created_at
          )
          from public.activity_responses
          where activity_responses.response_id = responses.id
        ),
        '[]'::jsonb
      )
  )
  from public.responses
  where responses.id = target_response_id;
$$;

drop function if exists public.start_public_response(text, text);
create or replace function public.start_public_response(
  target_public_token text,
  target_participant_token text
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

drop function if exists public.save_public_activity_response(text, text, uuid, text, jsonb);
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
    where activities.id = target_activity_id
      and activities.assessment_id = target_assessment_id
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

drop function if exists public.submit_public_response(text, text);
create or replace function public.submit_public_response(
  target_public_token text,
  target_participant_token text
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
  submitted_at_value timestamptz := now();
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

  update public.responses
  set status = 'submitted',
      submitted_at = submitted_at_value,
      updated_at = submitted_at_value
  where responses.id = target_response_id;

  update public.participants
  set status = 'submitted',
      submitted_at = submitted_at_value
  where participants.id = target_participant_id;

  return public.response_to_json(target_response_id);
end;
$$;

grant execute on function public.start_public_response(text, text) to anon, authenticated;
grant execute on function public.save_public_activity_response(text, text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.submit_public_response(text, text) to anon, authenticated;

notify pgrst, 'reload schema';

alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.activities enable row level security;
alter table public.participants enable row level security;
alter table public.responses enable row level security;
alter table public.activity_responses enable row level security;

drop policy if exists "Designers manage own profiles" on public.profiles;
drop policy if exists "Designers manage own assessments" on public.assessments;
drop policy if exists "Designers create own assessments" on public.assessments;
drop policy if exists "Designers read own assessments" on public.assessments;
drop policy if exists "Designers update own assessments" on public.assessments;
drop policy if exists "Designers delete own assessments" on public.assessments;
drop policy if exists "Published assessments are readable by public token" on public.assessments;
drop policy if exists "Designers insert own activities" on public.activities;
drop policy if exists "Designers read own activities" on public.activities;
drop policy if exists "Designers update own activities" on public.activities;
drop policy if exists "Designers delete own activities" on public.activities;
drop policy if exists "Published activities are readable through assessment" on public.activities;
drop policy if exists "Participants can create participant rows" on public.participants;
drop policy if exists "Public participants can read their participant row" on public.participants;
drop policy if exists "Public participants can update their participant row" on public.participants;
drop policy if exists "Designers read participants for own assessments" on public.participants;
drop policy if exists "Designers read responses for own assessments" on public.responses;
drop policy if exists "Public participants can create responses" on public.responses;
drop policy if exists "Public participants can read in-progress responses" on public.responses;
drop policy if exists "Public participants can update in-progress responses" on public.responses;
drop policy if exists "Designers read activity responses for own assessments" on public.activity_responses;
drop policy if exists "Public participants can create activity responses" on public.activity_responses;
drop policy if exists "Public participants can read activity responses" on public.activity_responses;
drop policy if exists "Public participants can update activity responses" on public.activity_responses;

create policy "Designers manage own profiles"
  on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Designers create own assessments"
  on public.assessments
  for insert
  with check (owner_id = auth.uid());

create policy "Designers read own assessments"
  on public.assessments
  for select
  using (owner_id = auth.uid());

create policy "Designers update own assessments"
  on public.assessments
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Designers delete own assessments"
  on public.assessments
  for delete
  using (owner_id = auth.uid());

create policy "Published assessments are readable by public token"
  on public.assessments
  for select
  using (status = 'published' and public_token is not null);

create policy "Designers insert own activities"
  on public.activities
  for insert
  with check (public.is_assessment_owner(assessment_id));

create policy "Designers read own activities"
  on public.activities
  for select
  using (public.is_assessment_owner(assessment_id));

create policy "Designers update own activities"
  on public.activities
  for update
  using (public.is_assessment_owner(assessment_id))
  with check (public.is_assessment_owner(assessment_id));

create policy "Designers delete own activities"
  on public.activities
  for delete
  using (public.is_assessment_owner(assessment_id));

create policy "Published activities are readable through assessment"
  on public.activities
  for select
  using (public.is_published_assessment(assessment_id));

create policy "Designers read participants for own assessments"
  on public.participants
  for select
  using (public.is_assessment_owner(assessment_id));

create policy "Designers read responses for own assessments"
  on public.responses
  for select
  using (public.is_assessment_owner(assessment_id));

create policy "Designers read activity responses for own assessments"
  on public.activity_responses
  for select
  using (
    public.is_assessment_owner(
      (
        select responses.assessment_id
        from public.responses
        where responses.id = response_id
      )
    )
  );

-- Public participant writes intentionally go through SECURITY DEFINER RPCs above.
-- This avoids brittle anonymous RLS chains across participants, responses,
-- and activity_responses while keeping public reads limited to published
-- assessments and activities only.
