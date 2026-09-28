-- Live Session data foundation
--
-- Additive only: this migration creates a dedicated Live namespace and does
-- not alter Assessment tables, functions, RLS policies, or realtime setup.
-- It is intentionally transactional. The companion rollback file is manual
-- only and must never be run once Live data that must be retained exists.

begin;

create extension if not exists "pgcrypto" with schema extensions;

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  facilitator_name text,
  context_label text,
  participant_details_mode text not null default 'nickname_only'
    check (participant_details_mode in ('nickname_only', 'identified')),
  status text not null default 'draft'
    check (status in ('draft', 'setup', 'lobby', 'live', 'intermission', 'closed')),
  ritual_started_at timestamptz,
  ritual_ended_at timestamptz,
  export_docx_count integer not null default 0 check (export_docx_count >= 0),
  export_excel_count integer not null default 0 check (export_excel_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ritual_ended_at is null or ritual_started_at is null or ritual_ended_at >= ritual_started_at)
);

create table public.live_session_collaborators (
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'co_owner')),
  granted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (live_session_id, user_id),
  check (user_id <> granted_by)
);

create table public.live_activities (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  activity_type text not null check (activity_type in ('innesco', 'traccia', 'focus', 'priorita', 'patto')),
  order_index integer not null check (order_index >= 0),
  instance_index integer not null check (instance_index >= 1),
  instance_label text,
  prompt text not null default '' check (char_length(prompt) <= 8000),
  timer_enabled boolean not null default false,
  timer_duration integer check (timer_duration is null or timer_duration > 0),
  show_live_results boolean not null default true,
  surface_input_types jsonb,
  state text not null default 'pending' check (state in ('pending', 'live', 'paused', 'completed')),
  priority_source text check (priority_source is null or priority_source = 'manual' or priority_source ~ '^previous:[0-9]+$'),
  votes_per_participant integer not null default 1 check (votes_per_participant between 1 and 10),
  pact_statement_mode text check (pact_statement_mode is null or pact_statement_mode in ('build_live', 'predefined')),
  facilitator_note text,
  pact_text text,
  started_at timestamptz,
  ended_at timestamptz,
  timer_anchor_at timestamptz,
  paused_remaining_seconds integer check (paused_remaining_seconds is null or paused_remaining_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (live_session_id, order_index),
  unique (id, live_session_id),
  unique (live_session_id, activity_type, instance_index),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create table public.live_session_roles (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  role_name text not null check (char_length(trim(role_name)) between 1 and 240),
  created_at timestamptz not null default now(),
  unique (live_session_id, role_name)
);

create table public.live_participants (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  role_name text not null check (char_length(trim(role_name)) between 1 and 240),
  nickname text,
  first_name text,
  last_name text,
  organization text,
  contact text,
  display_name text,
  joined_at timestamptz not null default now(),
  unique (id, live_session_id)
);

create table public.live_responses (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  live_activity_id uuid not null,
  participant_id uuid,
  activity_type text not null check (activity_type in ('innesco', 'traccia', 'focus', 'priorita', 'patto')),
  response_text text not null check (char_length(response_text) <= 12000),
  response_category text,
  created_at timestamptz not null default now(),
  foreign key (live_activity_id, live_session_id)
    references public.live_activities(id, live_session_id) on delete cascade,
  foreign key (participant_id, live_session_id)
    references public.live_participants(id, live_session_id) on delete set null
);

create table public.live_priority_items (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  live_activity_id uuid not null,
  source_type text not null check (source_type in ('previous_activity', 'manual')),
  label text not null check (char_length(trim(label)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (id, live_activity_id, live_session_id),
  foreign key (live_activity_id, live_session_id)
    references public.live_activities(id, live_session_id) on delete cascade
);

create table public.live_priority_votes (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  live_activity_id uuid not null,
  participant_id uuid not null,
  live_priority_item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (live_activity_id, participant_id, live_priority_item_id),
  foreign key (live_activity_id, live_session_id)
    references public.live_activities(id, live_session_id) on delete cascade,
  foreign key (participant_id, live_session_id)
    references public.live_participants(id, live_session_id) on delete cascade,
  foreign key (live_priority_item_id, live_activity_id, live_session_id)
    references public.live_priority_items(id, live_activity_id, live_session_id) on delete cascade
);

create table public.live_pacts (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  live_activity_id uuid not null,
  pact_text text not null,
  pact_statement_mode text not null default 'predefined' check (pact_statement_mode in ('build_live', 'predefined')),
  facilitator_note text,
  pact_rounds jsonb not null default '[]'::jsonb check (jsonb_typeof(pact_rounds) = 'array'),
  current_round_number integer check (current_round_number is null or current_round_number >= 1),
  confirmed_pact_proposal text,
  confirmed_round_number integer check (confirmed_round_number is null or confirmed_round_number >= 1),
  resolved_final_statement text not null,
  created_at timestamptz not null default now(),
  unique (id, live_activity_id, live_session_id),
  unique (live_activity_id),
  foreign key (live_activity_id, live_session_id)
    references public.live_activities(id, live_session_id) on delete cascade
);

create table public.live_pact_votes (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  live_activity_id uuid not null,
  participant_id uuid not null,
  round_number integer not null default 1 check (round_number >= 1),
  adhesion_level text not null check (adhesion_level in ('Concordo', 'Parzialmente', 'Non concordo')),
  created_at timestamptz not null default now(),
  unique (live_activity_id, participant_id, round_number),
  foreign key (live_activity_id, live_session_id)
    references public.live_activities(id, live_session_id) on delete cascade,
  foreign key (participant_id, live_session_id)
    references public.live_participants(id, live_session_id) on delete cascade
);

-- Token hashes are physically separated from records visible to browser
-- roles. This prevents a logged-in public participant from gaining access to
-- sensitive columns through the authenticated role.
create table public.live_session_access_tokens (
  live_session_id uuid primary key references public.live_sessions(id) on delete cascade,
  participant_join_token_hash text not null check (participant_join_token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

create table public.live_participant_tokens (
  participant_id uuid primary key,
  live_session_id uuid not null,
  participant_token_hash text not null check (participant_token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (participant_id, live_session_id)
    references public.live_participants(id, live_session_id) on delete cascade
);

create index live_sessions_account_id_idx on public.live_sessions(account_id);
create index live_sessions_owner_id_idx on public.live_sessions(owner_id);
create index live_session_collaborators_user_id_idx on public.live_session_collaborators(user_id);
create index live_activities_session_order_idx on public.live_activities(live_session_id, order_index);
create index live_session_roles_session_id_idx on public.live_session_roles(live_session_id);
create index live_participants_session_joined_at_idx on public.live_participants(live_session_id, joined_at);
create index live_responses_session_activity_idx on public.live_responses(live_session_id, live_activity_id, created_at);
create index live_priority_items_session_activity_idx on public.live_priority_items(live_session_id, live_activity_id, created_at);
create index live_priority_votes_session_activity_idx on public.live_priority_votes(live_session_id, live_activity_id, created_at);
create index live_pacts_session_activity_idx on public.live_pacts(live_session_id, live_activity_id);
create index live_pact_votes_session_activity_idx on public.live_pact_votes(live_session_id, live_activity_id, created_at);

create or replace function public.live_current_account_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_account_id uuid;
begin
  select id
  into target_account_id
  from public.accounts
  where owner_user_id = auth.uid()
  limit 1;

  if target_account_id is null then
    raise exception 'No account is available for the authenticated user.';
  end if;

  return target_account_id;
end;
$$;

alter table public.live_sessions
  alter column account_id set default public.live_current_account_id();

create or replace function public.live_enforce_account_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.accounts
    where id = new.account_id
      and owner_user_id = new.owner_id
  ) then
    raise exception 'Live Session account must belong to its owner.';
  end if;
  return new;
end;
$$;

create trigger live_sessions_enforce_account_owner
  before insert or update of account_id, owner_id on public.live_sessions
  for each row execute procedure public.live_enforce_account_owner();

create or replace function public.live_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger live_sessions_touch_updated_at
  before update on public.live_sessions
  for each row execute procedure public.live_touch_updated_at();

create trigger live_session_collaborators_touch_updated_at
  before update on public.live_session_collaborators
  for each row execute procedure public.live_touch_updated_at();

create trigger live_activities_touch_updated_at
  before update on public.live_activities
  for each row execute procedure public.live_touch_updated_at();

create or replace function public.live_is_session_editor(target_live_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_session_collaborators
    where live_session_id = target_live_session_id
      and user_id = auth.uid()
      and role = 'editor'
  );
$$;

create or replace function public.live_is_session_co_owner(target_live_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_session_collaborators
    where live_session_id = target_live_session_id
      and user_id = auth.uid()
      and role = 'co_owner'
  );
$$;

create or replace function public.live_can_access_session(target_live_session_id uuid)
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
      and (
        owner_id = auth.uid()
        or public.live_is_session_editor(id)
        or public.live_is_session_co_owner(id)
        or public.is_platform_admin()
      )
  );
$$;

create or replace function public.live_can_edit_session(target_live_session_id uuid)
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
      and (
        owner_id = auth.uid()
        or public.live_is_session_editor(id)
        or public.live_is_session_co_owner(id)
      )
  );
$$;

create or replace function public.live_can_manage_collaborators(target_live_session_id uuid)
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
      and (owner_id = auth.uid() or public.live_is_session_co_owner(id))
  );
$$;

create or replace function public.live_can_delete_session(target_live_session_id uuid)
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
      and (owner_id = auth.uid() or public.live_is_session_co_owner(id))
  );
$$;

create or replace function public.live_request_header(header_name text)
returns text
language plpgsql
stable
as $$
declare
  headers jsonb;
begin
  headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  return headers ->> lower(header_name);
exception when others then
  return null;
end;
$$;

create or replace function public.live_token_hash(token text)
returns text
language sql
immutable
as $$
  select case
    when token is null or length(token) = 0 then null
    else encode(extensions.digest(token::text, 'sha256'::text), 'hex')
  end;
$$;

create or replace function public.live_request_participant_id()
returns uuid
language plpgsql
stable
as $$
declare
  raw_id text;
begin
  raw_id := public.live_request_header('x-live-participant-id');
  if raw_id is null or raw_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return raw_id::uuid;
end;
$$;

create or replace function public.live_has_join_access(target_live_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_session_access_tokens access_token
    where access_token.live_session_id = target_live_session_id
      and access_token.participant_join_token_hash = public.live_token_hash(public.live_request_header('x-live-join-token'))
  );
$$;

create or replace function public.live_is_participant(target_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_participant_tokens participant_token
    where participant_token.participant_id = target_participant_id
      and participant_token.participant_id = public.live_request_participant_id()
      and participant_token.participant_token_hash = public.live_token_hash(public.live_request_header('x-live-participant-token'))
  );
$$;

create or replace function public.live_has_participant_access(target_live_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_participant_tokens participant_token
    where participant_token.live_session_id = target_live_session_id
      and participant_token.participant_id = public.live_request_participant_id()
      and participant_token.participant_token_hash = public.live_token_hash(public.live_request_header('x-live-participant-token'))
  );
$$;

-- Public joining is deliberately a narrowly scoped RPC: it verifies the QR
-- token, stores only its hash, and returns no token material or private data.
create or replace function public.live_join_session(
  target_live_session_id uuid,
  target_join_token text,
  target_participant_token text,
  target_role_name text,
  target_nickname text default null,
  target_first_name text default null,
  target_last_name text default null,
  target_organization text default null,
  target_contact text default null,
  target_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_participant public.live_participants%rowtype;
begin
  if target_join_token !~ '^[A-Za-z0-9_-]{16,200}$'
    or target_participant_token !~ '^[A-Za-z0-9_-]{16,200}$'
    or coalesce(char_length(trim(target_role_name)), 0) > 240
    or coalesce(char_length(trim(target_role_name)), 0) = 0
    or coalesce(char_length(target_nickname), 0) > 240
    or coalesce(char_length(target_first_name), 0) > 240
    or coalesce(char_length(target_last_name), 0) > 240
    or coalesce(char_length(target_organization), 0) > 240
    or coalesce(char_length(target_contact), 0) > 500
    or coalesce(char_length(target_display_name), 0) > 500 then
    raise exception 'Invalid Live Session join request.';
  end if;

  if not exists (
    select 1
    from public.live_sessions session_row
    join public.live_session_access_tokens access_token
      on access_token.live_session_id = session_row.id
    where session_row.id = target_live_session_id
      and session_row.status in ('lobby', 'live', 'intermission')
      and access_token.participant_join_token_hash = public.live_token_hash(target_join_token)
  ) then
    raise exception 'Live Session is unavailable.';
  end if;

  insert into public.live_participants (
    live_session_id,
    role_name,
    nickname,
    first_name,
    last_name,
    organization,
    contact,
    display_name
  )
  values (
    target_live_session_id,
    trim(target_role_name),
    nullif(trim(target_nickname), ''),
    nullif(trim(target_first_name), ''),
    nullif(trim(target_last_name), ''),
    nullif(trim(target_organization), ''),
    nullif(trim(target_contact), ''),
    nullif(trim(target_display_name), '')
  )
  returning * into created_participant;

  insert into public.live_participant_tokens (participant_id, live_session_id, participant_token_hash)
  values (
    created_participant.id,
    created_participant.live_session_id,
    public.live_token_hash(target_participant_token)
  );

  return jsonb_build_object(
    'id', created_participant.id,
    'live_session_id', created_participant.live_session_id,
    'role_name', created_participant.role_name,
    'nickname', created_participant.nickname,
    'first_name', created_participant.first_name,
    'last_name', created_participant.last_name,
    'organization', created_participant.organization,
    'contact', created_participant.contact,
    'display_name', created_participant.display_name,
    'joined_at', created_participant.joined_at
  );
end;
$$;

alter table public.live_sessions enable row level security;
alter table public.live_session_collaborators enable row level security;
alter table public.live_activities enable row level security;
alter table public.live_session_roles enable row level security;
alter table public.live_participants enable row level security;
alter table public.live_responses enable row level security;
alter table public.live_priority_items enable row level security;
alter table public.live_priority_votes enable row level security;
alter table public.live_pacts enable row level security;
alter table public.live_pact_votes enable row level security;
alter table public.live_session_access_tokens enable row level security;
alter table public.live_participant_tokens enable row level security;

revoke all on table public.live_session_access_tokens from anon, authenticated;
revoke all on table public.live_participant_tokens from anon, authenticated;

revoke all on function public.live_current_account_id() from public, anon;
revoke all on function public.live_enforce_account_owner() from public, anon, authenticated;
revoke all on function public.live_touch_updated_at() from public, anon, authenticated;
revoke all on function public.live_is_session_editor(uuid) from public, anon;
revoke all on function public.live_is_session_co_owner(uuid) from public, anon;
revoke all on function public.live_can_access_session(uuid) from public, anon;
revoke all on function public.live_can_edit_session(uuid) from public, anon;
revoke all on function public.live_can_manage_collaborators(uuid) from public, anon;
revoke all on function public.live_can_delete_session(uuid) from public, anon;
revoke all on function public.live_request_header(text) from public;
revoke all on function public.live_token_hash(text) from public;
revoke all on function public.live_request_participant_id() from public;
revoke all on function public.live_has_join_access(uuid) from public;
revoke all on function public.live_is_participant(uuid) from public;
revoke all on function public.live_has_participant_access(uuid) from public;
revoke all on function public.live_join_session(uuid, text, text, text, text, text, text, text, text, text) from public;

grant execute on function public.live_current_account_id() to authenticated;
grant execute on function public.live_is_session_editor(uuid) to authenticated;
grant execute on function public.live_is_session_co_owner(uuid) to authenticated;
grant execute on function public.live_can_access_session(uuid) to authenticated;
grant execute on function public.live_can_edit_session(uuid) to authenticated;
grant execute on function public.live_can_manage_collaborators(uuid) to authenticated;
grant execute on function public.live_can_delete_session(uuid) to authenticated;
grant execute on function public.live_request_header(text) to anon, authenticated;
grant execute on function public.live_token_hash(text) to anon, authenticated;
grant execute on function public.live_request_participant_id() to anon, authenticated;
grant execute on function public.live_has_join_access(uuid) to anon, authenticated;
grant execute on function public.live_is_participant(uuid) to anon, authenticated;
grant execute on function public.live_has_participant_access(uuid) to anon, authenticated;
grant execute on function public.live_join_session(uuid, text, text, text, text, text, text, text, text, text) to anon, authenticated;

revoke all on table public.live_sessions from anon, authenticated;
grant select (id, title, facilitator_name, context_label, participant_details_mode, status, ritual_started_at, ritual_ended_at, export_docx_count, export_excel_count, error_count, created_at, updated_at)
  on public.live_sessions to anon, authenticated;
grant insert (title, facilitator_name, context_label, participant_details_mode, status, ritual_started_at, ritual_ended_at, export_docx_count, export_excel_count, error_count)
  on public.live_sessions to authenticated;
grant update (title, facilitator_name, context_label, participant_details_mode, status, ritual_started_at, ritual_ended_at, export_docx_count, export_excel_count, error_count)
  on public.live_sessions to authenticated;
grant delete on public.live_sessions to authenticated;

revoke all on table public.live_session_collaborators from anon, authenticated;
grant select, insert, update, delete on public.live_session_collaborators to authenticated;

revoke all on table public.live_activities from anon, authenticated;
grant select on public.live_activities to anon, authenticated;
grant insert, update, delete on public.live_activities to authenticated;

revoke all on table public.live_session_roles from anon, authenticated;
grant select on public.live_session_roles to anon, authenticated;
grant insert, update, delete on public.live_session_roles to authenticated;

revoke all on table public.live_participants from anon, authenticated;
grant select on public.live_participants to anon, authenticated;
grant update, delete on public.live_participants to authenticated;

revoke all on table public.live_responses from anon, authenticated;
grant select, insert on public.live_responses to anon, authenticated;
grant delete on public.live_responses to authenticated;

revoke all on table public.live_priority_items from anon, authenticated;
grant select on public.live_priority_items to anon, authenticated;
grant insert, update, delete on public.live_priority_items to authenticated;

revoke all on table public.live_priority_votes from anon, authenticated;
grant select, insert, delete on public.live_priority_votes to anon, authenticated;

revoke all on table public.live_pacts from anon, authenticated;
grant select on public.live_pacts to anon, authenticated;
grant insert, update, delete on public.live_pacts to authenticated;

revoke all on table public.live_pact_votes from anon, authenticated;
grant select, insert, delete on public.live_pact_votes to anon, authenticated;

create policy "Live members read sessions"
  on public.live_sessions for select to authenticated
  using (public.live_can_access_session(id));

create policy "Live public access reads sessions"
  on public.live_sessions for select to anon, authenticated
  using (public.live_has_join_access(id) or public.live_has_participant_access(id));

create policy "Live owners create sessions"
  on public.live_sessions for insert to authenticated
  with check (owner_id = auth.uid() and account_id = public.live_current_account_id());

create policy "Live members update sessions"
  on public.live_sessions for update to authenticated
  using (public.live_can_edit_session(id))
  with check (public.live_can_edit_session(id));

create policy "Live owners and co-owners delete sessions"
  on public.live_sessions for delete to authenticated
  using (public.live_can_delete_session(id));

create policy "Live members read collaborators"
  on public.live_session_collaborators for select to authenticated
  using (public.live_can_access_session(live_session_id));

create policy "Live owners and co-owners manage collaborators"
  on public.live_session_collaborators for all to authenticated
  using (public.live_can_manage_collaborators(live_session_id))
  with check (public.live_can_manage_collaborators(live_session_id));

create policy "Live members and public access read activities"
  on public.live_activities for select to anon, authenticated
  using (
    public.live_can_access_session(live_session_id)
    or public.live_has_join_access(live_session_id)
    or public.live_has_participant_access(live_session_id)
  );

create policy "Live members manage activities"
  on public.live_activities for all to authenticated
  using (public.live_can_edit_session(live_session_id))
  with check (public.live_can_edit_session(live_session_id));

create policy "Live members and public access read session roles"
  on public.live_session_roles for select to anon, authenticated
  using (
    public.live_can_access_session(live_session_id)
    or public.live_has_join_access(live_session_id)
    or public.live_has_participant_access(live_session_id)
  );

create policy "Live members manage session roles"
  on public.live_session_roles for all to authenticated
  using (public.live_can_edit_session(live_session_id))
  with check (public.live_can_edit_session(live_session_id));

create policy "Live members or scoped participant read participants"
  on public.live_participants for select to anon, authenticated
  using (public.live_can_access_session(live_session_id) or public.live_is_participant(id));

create policy "Live members manage participants"
  on public.live_participants for update to authenticated
  using (public.live_can_edit_session(live_session_id))
  with check (public.live_can_edit_session(live_session_id));

create policy "Live members delete participants"
  on public.live_participants for delete to authenticated
  using (public.live_can_edit_session(live_session_id));

create policy "Live members or scoped participant read responses"
  on public.live_responses for select to anon, authenticated
  using (public.live_can_access_session(live_session_id) or public.live_is_participant(participant_id));

create policy "Live participants submit current responses"
  on public.live_responses for insert to anon, authenticated
  with check (
    public.live_is_participant(participant_id)
    and exists (
      select 1
      from public.live_sessions session_row
      join public.live_activities activity_row
        on activity_row.id = live_responses.live_activity_id
       and activity_row.live_session_id = session_row.id
      where session_row.id = live_responses.live_session_id
        and session_row.status = 'live'
        and activity_row.state = 'live'
        and activity_row.activity_type = live_responses.activity_type
    )
  );

create policy "Live members delete responses"
  on public.live_responses for delete to authenticated
  using (public.live_can_edit_session(live_session_id));

create policy "Live members and public access read priority items"
  on public.live_priority_items for select to anon, authenticated
  using (
    public.live_can_access_session(live_session_id)
    or public.live_has_join_access(live_session_id)
    or public.live_has_participant_access(live_session_id)
  );

create policy "Live members manage priority items"
  on public.live_priority_items for all to authenticated
  using (public.live_can_edit_session(live_session_id))
  with check (public.live_can_edit_session(live_session_id));

create policy "Live members or scoped participant read priority votes"
  on public.live_priority_votes for select to anon, authenticated
  using (public.live_can_access_session(live_session_id) or public.live_is_participant(participant_id));

create policy "Live participants submit current priority votes"
  on public.live_priority_votes for insert to anon, authenticated
  with check (
    public.live_is_participant(participant_id)
    and exists (
      select 1
      from public.live_sessions session_row
      join public.live_activities activity_row
        on activity_row.id = live_priority_votes.live_activity_id
       and activity_row.live_session_id = session_row.id
      join public.live_priority_items item_row
        on item_row.id = live_priority_votes.live_priority_item_id
       and item_row.live_activity_id = activity_row.id
       and item_row.live_session_id = session_row.id
      where session_row.id = live_priority_votes.live_session_id
        and session_row.status = 'live'
        and activity_row.state = 'live'
        and activity_row.activity_type = 'priorita'
    )
  );

create policy "Live members or scoped participant delete priority votes"
  on public.live_priority_votes for delete to anon, authenticated
  using (public.live_can_edit_session(live_session_id) or public.live_is_participant(participant_id));

create policy "Live members or scoped participant read pacts"
  on public.live_pacts for select to anon, authenticated
  using (public.live_can_access_session(live_session_id) or public.live_has_participant_access(live_session_id));

create policy "Live members manage pacts"
  on public.live_pacts for all to authenticated
  using (public.live_can_edit_session(live_session_id))
  with check (public.live_can_edit_session(live_session_id));

create policy "Live members or scoped participant read pact votes"
  on public.live_pact_votes for select to anon, authenticated
  using (public.live_can_access_session(live_session_id) or public.live_is_participant(participant_id));

create policy "Live participants submit current pact votes"
  on public.live_pact_votes for insert to anon, authenticated
  with check (
    public.live_is_participant(participant_id)
    and exists (
      select 1
      from public.live_sessions session_row
      join public.live_activities activity_row
        on activity_row.id = live_pact_votes.live_activity_id
       and activity_row.live_session_id = session_row.id
      join public.live_pacts pact_row
        on pact_row.live_activity_id = activity_row.id
       and pact_row.live_session_id = session_row.id
      where session_row.id = live_pact_votes.live_session_id
        and session_row.status = 'live'
        and activity_row.state = 'live'
        and activity_row.activity_type = 'patto'
        and pact_row.current_round_number = live_pact_votes.round_number
    )
  );

create policy "Live members or scoped participant delete pact votes"
  on public.live_pact_votes for delete to anon, authenticated
  using (public.live_can_edit_session(live_session_id) or public.live_is_participant(participant_id));

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'live_sessions',
    'live_activities',
    'live_session_roles',
    'live_participants',
    'live_responses',
    'live_priority_items',
    'live_priority_votes',
    'live_pacts',
    'live_pact_votes'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
