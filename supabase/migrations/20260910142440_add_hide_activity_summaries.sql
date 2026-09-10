alter table public.assessments
  add column if not exists hide_activity_summaries boolean not null default false;

notify pgrst, 'reload schema';
