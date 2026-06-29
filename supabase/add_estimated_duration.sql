alter table public.assessments
  add column if not exists estimated_duration text;

notify pgrst, 'reload schema';
