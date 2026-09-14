-- Existing-assessment account backfill (DRAFT — TEST ON STAGING FIRST)
--
-- Prerequisite: 20260913224037_add_account_access_foundation.sql has completed.
-- This migration is transactional. It only adds account references and version
-- roots; it never changes assessment content, public tokens, activities,
-- participants, responses, activity responses, or profiles.
--
-- Do not apply until the production preflight has confirmed:
--   * a current backup is available and its restore path is documented;
--   * the same migration succeeds on an isolated staging environment;
--   * every assessments.owner_id still references an auth.users row;
--   * the platform-admin account is identified separately with a verified UUID.

begin;

-- Stop rather than silently joining an assessment to an account owned by a
-- different user. This guard also makes a partially prepared environment safe
-- to inspect before any write is committed.
do $$
begin
  if exists (
    select 1
    from public.assessments assessment
    join public.accounts account on account.id = assessment.account_id
    where account.owner_user_id <> assessment.owner_id
  ) then
    raise exception
      'Cannot backfill accounts: an assessment is already linked to an account with a different owner.';
  end if;
end;
$$;

-- There is one workspace account per pre-existing assessment owner. Current
-- owners are treated as active because they already have authenticated access.
-- The initial kind is individual because the old schema cannot reliably infer
-- whether a login represents an organisation; this can be changed later by
-- the account owner without affecting assessments or responses.
insert into public.accounts (
  owner_user_id,
  name,
  kind,
  status
)
select distinct on (assessment.owner_id)
  assessment.owner_id,
  coalesce(
    nullif(trim(profile.full_name), ''),
    nullif(split_part(coalesce(profile.email, auth_user.email), '@', 1), ''),
    'Existing account'
  ),
  'individual',
  'active'
from public.assessments assessment
join auth.users auth_user on auth_user.id = assessment.owner_id
left join public.profiles profile on profile.id = assessment.owner_id
where assessment.account_id is null
order by assessment.owner_id, assessment.created_at
on conflict (owner_user_id) do nothing;

-- Link each legacy assessment to its owner's account. The WHERE clause keeps
-- pre-existing links untouched, and the preceding guard rejects a mismatch.
update public.assessments assessment
set account_id = account.id
from public.accounts account
where assessment.account_id is null
  and account.owner_user_id = assessment.owner_id;

-- Every existing assessment is the first version of its own immutable lineage.
-- No questionnaire structure or answer is cloned, moved, or deleted here.
update public.assessments
set version_root_id = id
where version_root_id is null;

-- Fail the transaction if the expected one-to-one ownership mapping was not
-- achieved. This prevents a partially migrated production state.
do $$
begin
  if exists (
    select 1
    from public.assessments assessment
    where assessment.account_id is null
       or assessment.version_root_id is null
  ) then
    raise exception
      'Account backfill incomplete: one or more assessments have no account or version root.';
  end if;

  if exists (
    select 1
    from public.assessments assessment
    join public.accounts account on account.id = assessment.account_id
    where account.owner_user_id <> assessment.owner_id
  ) then
    raise exception
      'Account backfill integrity check failed: owner/account mismatch.';
  end if;
end;
$$;

commit;
