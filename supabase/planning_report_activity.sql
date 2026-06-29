alter table public.activities
  drop constraint if exists activities_type_check;

alter table public.activities
  add constraint activities_type_check
  check (type in ('profiling', 'exploration', 'prioritization', 'framing', 'planning_report'));

alter table public.activity_responses
  drop constraint if exists activity_responses_activity_type_check;

alter table public.activity_responses
  add constraint activity_responses_activity_type_check
  check (activity_type in ('profiling', 'exploration', 'prioritization', 'framing', 'planning_report'));
