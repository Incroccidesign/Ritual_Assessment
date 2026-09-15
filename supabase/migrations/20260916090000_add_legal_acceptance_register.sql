-- Legal acceptance register.
--
-- This migration is additive: it creates a dedicated, server-written audit
-- record and does not alter accounts, assessments, participants or responses.
begin;

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_key text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, document_key, document_version),
  check (char_length(document_key) between 1 and 120),
  check (char_length(document_version) between 1 and 40)
);

create index if not exists legal_acceptances_user_document_idx
  on public.legal_acceptances (user_id, document_key, accepted_at desc);

alter table public.legal_acceptances enable row level security;
revoke all on table public.legal_acceptances from anon, authenticated;

notify pgrst, 'reload schema';

commit;
