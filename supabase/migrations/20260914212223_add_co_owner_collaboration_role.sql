begin;

-- Existing editor memberships remain valid. Co-owners are deliberately a
-- separate role so elevated collaboration cannot be granted by mistake.
alter table public.assessment_collaborators
  drop constraint if exists assessment_collaborators_role_check;

alter table public.assessment_collaborators
  add constraint assessment_collaborators_role_check
  check (role in ('editor', 'co_owner'));

create or replace function public.is_assessment_co_owner(target_assessment_id uuid)
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
      and role = 'co_owner'
  );
$$;

create or replace function public.can_manage_assessment_collaborators(target_assessment_id uuid)
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
        or public.is_assessment_co_owner(id)
      )
  );
$$;

create or replace function public.can_delete_assessment(target_assessment_id uuid)
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
        or public.is_assessment_co_owner(id)
      )
  );
$$;

-- Co-owners can edit and read with editors, but are granted additional
-- management and deletion rights only through the functions above.
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
        or public.is_assessment_co_owner(id)
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
        or public.is_assessment_co_owner(id)
      )
  );
$$;

drop policy if exists "Owners delete assessments" on public.assessments;
create policy "Owners and co-owners delete assessments"
  on public.assessments for delete to authenticated
  using (public.can_delete_assessment(id));

revoke all on function public.is_assessment_co_owner(uuid) from public;
revoke all on function public.can_manage_assessment_collaborators(uuid) from public;
revoke all on function public.can_delete_assessment(uuid) from public;
grant execute on function public.is_assessment_co_owner(uuid) to authenticated;
grant execute on function public.can_manage_assessment_collaborators(uuid) to authenticated;
grant execute on function public.can_delete_assessment(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
