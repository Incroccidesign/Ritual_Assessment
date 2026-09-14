-- Immediate account deletion support.
--
-- Deleting an Auth user must remove the workspace row in the same database
-- transaction. Assessment data is already owned by auth.users through
-- owner_id with ON DELETE CASCADE, so it is removed consistently as part of
-- the user deletion rather than through a browser-controlled sequence.
begin;

alter table public.accounts
  drop constraint if exists accounts_owner_user_id_fkey;

alter table public.accounts
  add constraint accounts_owner_user_id_fkey
  foreign key (owner_user_id)
  references auth.users(id)
  on delete cascade;

commit;
