-- Scheduling is stored in the existing activity and activity_response records.
-- This privileged endpoint only records the organiser's final choice; individual
-- availability remains in the normal response path and is never exposed here.
begin;

create or replace function public.validate_scheduling_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  configured_slots jsonb;
begin
  if new.activity_type <> 'scheduling' then return new; end if;

  select config_json->'slots' into configured_slots
  from public.activities
  where id = new.activity_id
    and type = 'scheduling';

  if configured_slots is null
    or jsonb_typeof(new.answer_json->'slotIds') <> 'array'
    or jsonb_array_length(new.answer_json->'slotIds') = 0
    or exists (
      select 1
      from jsonb_array_elements_text(new.answer_json->'slotIds') submitted(slot_id)
      where not exists (
        select 1 from jsonb_array_elements(configured_slots) configured
        where configured->>'id' = submitted.slot_id
      )
    ) then
    raise exception 'Invalid scheduling availability.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_scheduling_response on public.activity_responses;
create trigger validate_scheduling_response
  before insert or update of activity_id, activity_type, answer_json on public.activity_responses
  for each row execute function public.validate_scheduling_response();

create or replace function public.confirm_scheduling_slot(
  target_assessment_id uuid,
  target_activity_id uuid,
  target_slot_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_config jsonb;
begin
  if auth.uid() is null or not public.is_assessment_owner(target_assessment_id) then
    raise exception 'Only the assessment owner can confirm a date.' using errcode = '42501';
  end if;

  select config_json into activity_config
  from public.activities
  where id = target_activity_id
    and assessment_id = target_assessment_id
    and type = 'scheduling'
  for update;

  if activity_config is null then
    raise exception 'Scheduling activity not found.' using errcode = 'P0002';
  end if;

  if target_slot_id is null or not exists (
    select 1 from jsonb_array_elements(coalesce(activity_config->'slots', '[]'::jsonb)) slot
    where slot->>'id' = target_slot_id
  ) then
    raise exception 'Proposed date not found.' using errcode = '22023';
  end if;

  update public.activities
  set config_json = jsonb_set(activity_config, '{confirmedSlotId}', to_jsonb(target_slot_id), true),
      updated_at = now()
  where id = target_activity_id;
end;
$$;

revoke all on function public.confirm_scheduling_slot(uuid, uuid, text) from public, anon;
grant execute on function public.confirm_scheduling_slot(uuid, uuid, text) to authenticated;

create or replace function public.get_public_scheduling_results(target_public_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'title', assessment.title,
    'description', assessment.description,
    'status', assessment.status,
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', activity.id,
        'title', activity.title,
        'prompt', activity.prompt,
        'mode', activity.config_json->>'mode',
        'timezone', activity.config_json->>'timezone',
        'slots', activity.config_json->'slots',
        'confirmedSlotId', activity.config_json->>'confirmedSlotId',
        'respondentCount', coalesce(stats.respondent_count, 0),
        'availability', coalesce(stats.availability, '[]'::jsonb)
      ) order by activity.order_index)
      from public.activities activity
      left join lateral (
        select respondents.count as respondent_count,
          jsonb_agg(jsonb_build_object('slotId', slot.id, 'count', coalesce(votes.count, 0), 'percentage', case when respondents.count = 0 then 0 else round(coalesce(votes.count, 0)::numeric * 100 / respondents.count) end)) as availability
        from jsonb_to_recordset(coalesce(activity.config_json->'slots', '[]'::jsonb)) as slot(id text)
        cross join lateral (
          select count(distinct response_id) from public.activity_responses answer
          where answer.activity_id = activity.id and jsonb_typeof(answer.answer_json->'slotIds') = 'array'
        ) respondents
        left join lateral (select count(*) from public.activity_responses answer where answer.activity_id = activity.id and answer.answer_json->'slotIds' ? slot.id) votes on true
        group by respondents.count
      ) stats on true
      where activity.assessment_id = assessment.id and activity.type = 'scheduling'
    ), '[]'::jsonb)
  )
  from public.assessments assessment
  where assessment.public_token = target_public_token
    and assessment.status in ('published', 'closed')
  limit 1;
$$;

revoke all on function public.get_public_scheduling_results(text) from public;
grant execute on function public.get_public_scheduling_results(text) to anon, authenticated;

commit;
