create or replace function public.reset_individual_assessment_results(target_assessment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_row public.assessments%rowtype;
  deleted_responses integer;
  deleted_participants integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select *
  into assessment_row
  from public.assessments
  where id = target_assessment_id
  for update;

  if assessment_row.id is null or assessment_row.owner_id <> auth.uid() then
    raise exception 'Only the assessment owner can reset results.' using errcode = '42501';
  end if;

  select count(*) into deleted_responses
  from public.responses
  where assessment_id = target_assessment_id;

  select count(*) into deleted_participants
  from public.participants
  where assessment_id = target_assessment_id;

  delete from public.responses
  where assessment_id = target_assessment_id;

  delete from public.participants
  where assessment_id = target_assessment_id;

  return jsonb_build_object(
    'deleted_responses', deleted_responses,
    'deleted_participants', deleted_participants
  );
end;
$$;

revoke all on function public.reset_individual_assessment_results(uuid) from public, anon;
grant execute on function public.reset_individual_assessment_results(uuid) to authenticated;
