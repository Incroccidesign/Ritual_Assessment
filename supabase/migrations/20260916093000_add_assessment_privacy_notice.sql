-- Per-assessment privacy contact details for participant-facing notices.
-- This is additive. Existing assessments and their responses remain unchanged.
begin;

alter table public.assessments
  add column if not exists data_controller_name text,
  add column if not exists data_controller_contact text;

create or replace function public.require_public_assessment_privacy_notice()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if nullif(btrim(coalesce(new.data_controller_name, '')), '') is null
      or nullif(btrim(coalesce(new.data_controller_contact, '')), '') is null then
      raise exception 'A data-controller name and privacy contact are required before publishing an assessment.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists require_public_assessment_privacy_notice on public.assessments;
create trigger require_public_assessment_privacy_notice
  before insert or update of status on public.assessments
  for each row execute function public.require_public_assessment_privacy_notice();

revoke all on function public.require_public_assessment_privacy_notice() from public, anon, authenticated;

create or replace function public.get_public_assessment(target_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment_row public.assessments%rowtype;
begin
  if target_public_token is null or char_length(target_public_token) < 16 or char_length(target_public_token) > 200 then
    return null;
  end if;

  select * into assessment_row
  from public.assessments
  where public_token = target_public_token and status in ('published', 'paused', 'closed')
  limit 1;

  if assessment_row.id is null then return null; end if;

  if assessment_row.status <> 'published' then
    return jsonb_build_object(
      'id', assessment_row.id, 'owner_id', '', 'title', assessment_row.title,
      'description', null, 'data_controller_name', assessment_row.data_controller_name,
      'data_controller_contact', assessment_row.data_controller_contact,
      'estimated_duration', null, 'hide_activity_summaries', false, 'language', assessment_row.language,
      'status', assessment_row.status, 'public_token', assessment_row.public_token,
      'created_at', assessment_row.created_at, 'updated_at', assessment_row.updated_at,
      'published_at', assessment_row.published_at, 'activities', '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'id', assessment_row.id, 'owner_id', '', 'title', assessment_row.title,
    'description', assessment_row.description, 'data_controller_name', assessment_row.data_controller_name,
    'data_controller_contact', assessment_row.data_controller_contact,
    'estimated_duration', assessment_row.estimated_duration, 'hide_activity_summaries', assessment_row.hide_activity_summaries,
    'language', assessment_row.language, 'status', assessment_row.status, 'public_token', assessment_row.public_token,
    'created_at', assessment_row.created_at, 'updated_at', assessment_row.updated_at, 'published_at', assessment_row.published_at,
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', activity.id, 'assessment_id', activity.assessment_id, 'type', activity.type,
        'title', activity.title, 'prompt', activity.prompt, 'order_index', activity.order_index,
        'config_json', activity.config_json, 'created_at', activity.created_at, 'updated_at', activity.updated_at
      ) order by activity.order_index)
      from public.activities activity where activity.assessment_id = assessment_row.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_public_assessment(text) from public;
grant execute on function public.get_public_assessment(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
