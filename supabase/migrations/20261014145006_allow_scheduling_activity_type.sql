-- Extend the existing activity discriminator without changing stored rows.
begin;

alter table public.activities
  drop constraint if exists activities_type_check;

alter table public.activities
  add constraint activities_type_check
  check (type in ('profiling', 'exploration', 'prioritization', 'framing', 'planning_report', 'scheduling'));

commit;
