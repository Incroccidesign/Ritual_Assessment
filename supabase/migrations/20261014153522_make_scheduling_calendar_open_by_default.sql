begin;

-- A Scheduling activity always collects each participant's availability.
-- Existing activities retain their configured slots but no longer need an opt-in flag.
create or replace function public.validate_scheduling_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_config jsonb;
  configured_slots jsonb;
  participant_slots jsonb;
begin
  if new.activity_type <> 'scheduling' then return new; end if;

  select config_json into activity_config
  from public.activities
  where id = new.activity_id and type = 'scheduling';

  configured_slots := coalesce(activity_config->'slots', '[]'::jsonb);
  participant_slots := coalesce(new.answer_json->'suggestedSlots', '[]'::jsonb);

  if activity_config is null
    or jsonb_typeof(new.answer_json->'slotIds') <> 'array'
    or jsonb_array_length(new.answer_json->'slotIds') = 0
    or jsonb_array_length(new.answer_json->'slotIds') > 100
    or jsonb_typeof(participant_slots) <> 'array'
    or jsonb_array_length(participant_slots) > 100
    or exists (
      select 1
      from jsonb_array_elements_text(new.answer_json->'slotIds') submitted(slot_id)
      where not exists (
        select 1 from jsonb_array_elements(configured_slots) configured where configured->>'id' = submitted.slot_id
      )
      and not exists (
        select 1 from jsonb_array_elements(participant_slots) proposed where proposed->>'id' = submitted.slot_id
      )
    )
    or exists (
      select 1 from jsonb_array_elements(participant_slots) proposed
      where proposed->>'id' !~ '^suggested:[0-9]{4}-[0-9]{2}-[0-9]{2}(:[0-9]{2}:[0-9]{2})?$'
        or proposed->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or (
          activity_config->>'mode' = 'weekly'
          and (proposed->>'startTime' !~ '^[0-2][0-9]:[0-5][0-9]$' or proposed->>'endTime' !~ '^[0-2][0-9]:[0-5][0-9]$')
        )
        or (
          activity_config->>'mode' = 'monthly'
          and (proposed ? 'startTime' or proposed ? 'endTime')
        )
    )
    or exists (
      select 1 from jsonb_array_elements(participant_slots) proposed
      where not exists (
        select 1 from jsonb_array_elements_text(new.answer_json->'slotIds') submitted(slot_id)
        where submitted.slot_id = proposed->>'id'
      )
    ) then
    raise exception 'Invalid scheduling availability.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_scheduling_response() from public, anon, authenticated;

commit;
