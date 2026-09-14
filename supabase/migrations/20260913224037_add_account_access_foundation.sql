-- Account and access-control foundation (DRAFT — NOT APPLIED)
--
-- This migration is intentionally additive. It does not insert, update, or
-- delete data from existing assessments, participants, responses, or profiles.
-- Existing assessments keep their current owner_id and behaviour until the
-- later, separately reviewed backfill and application releases are deployed.
--
-- Before applying this migration in any environment:
--   1. verify the live schema matches supabase/schema.sql;
--   2. take a backup and test it against a staging copy;
--   3. review the follow-up backfill for account_id/version_root_id;
--   4. seed the platform administrator using a verified auth.users UUID.

begin;

-- A registered user can own a personal or organisational workspace. This is
-- deliberately separate from auth.users so the future account lifecycle can
-- be managed without changing Supabase Auth records directly.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete restrict,
  name text not null,
  kind text not null default 'individual'
    check (kind in ('individual', 'organization')),
  status text not null default 'pending_verification'
    check (status in (
      'pending_verification',
      'active',
      'suspended',
      'deletion_requested',
      'deleted'
    )),
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'deletion_requested' and deletion_requested_at is not null and deletion_scheduled_for is not null)
    or status <> 'deletion_requested'
  )
);

-- The platform-admin role is allow-listed server-side. It must never be
-- inferred from browser state, a profile field, or user-controlled metadata.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- An editor is a registered user who can work on one specific assessment.
-- Ownership stays in assessments.owner_id during the transition, while the
-- account_id column below enables the future account boundary.
create table if not exists public.assessment_collaborators (
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role = 'editor'),
  granted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (assessment_id, user_id),
  check (user_id <> granted_by)
);

-- Minimal technical audit trail for sensitive actions performed by a platform
-- administrator. Payloads must contain identifiers and reasons only: never
-- participant answers, profiling data, passwords, tokens, or export contents.
create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_account_id uuid references public.accounts(id) on delete set null,
  target_assessment_id uuid references public.assessments(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);

-- Additive columns only. All are nullable where a value would require a
-- backfill, so the currently collected data remains unchanged.
alter table public.assessments
  add column if not exists account_id uuid references public.accounts(id) on delete restrict,
  add column if not exists version_root_id uuid references public.assessments(id) on delete restrict,
  add column if not exists supersedes_assessment_id uuid references public.assessments(id) on delete set null,
  add column if not exists version_number integer not null default 1 check (version_number > 0),
  add column if not exists closed_at timestamptz,
  add column if not exists retention_expires_at timestamptz,
  add column if not exists retention_exception_until timestamptz;

create index if not exists accounts_owner_user_id_idx
  on public.accounts(owner_user_id);
create index if not exists accounts_status_idx
  on public.accounts(status);
create index if not exists assessment_collaborators_user_id_idx
  on public.assessment_collaborators(user_id);
create index if not exists assessment_collaborators_granted_by_idx
  on public.assessment_collaborators(granted_by);
create index if not exists assessments_account_id_idx
  on public.assessments(account_id);
create index if not exists assessments_version_root_id_idx
  on public.assessments(version_root_id);
create index if not exists assessments_supersedes_assessment_id_idx
  on public.assessments(supersedes_assessment_id);
create index if not exists assessments_retention_expires_at_idx
  on public.assessments(retention_expires_at)
  where retention_expires_at is not null;
create index if not exists admin_audit_events_admin_user_id_occurred_at_idx
  on public.admin_audit_events(admin_user_id, occurred_at desc);
create index if not exists admin_audit_events_target_assessment_id_idx
  on public.admin_audit_events(target_assessment_id)
  where target_assessment_id is not null;
create index if not exists admin_audit_events_target_account_id_idx
  on public.admin_audit_events(target_account_id)
  where target_account_id is not null;
create index if not exists admin_audit_events_target_user_id_idx
  on public.admin_audit_events(target_user_id)
  where target_user_id is not null;

-- New sensitive tables are closed to browser roles by default. The future
-- server-side access layer will receive only the narrowly scoped grants it
-- needs; the service role remains server-only and is never exposed to clients.
alter table public.accounts enable row level security;
alter table public.platform_admins enable row level security;
alter table public.assessment_collaborators enable row level security;
alter table public.admin_audit_events enable row level security;

revoke all on table public.accounts from anon, authenticated;
revoke all on table public.platform_admins from anon, authenticated;
revoke all on table public.assessment_collaborators from anon, authenticated;
revoke all on table public.admin_audit_events from anon, authenticated;

notify pgrst, 'reload schema';

commit;
