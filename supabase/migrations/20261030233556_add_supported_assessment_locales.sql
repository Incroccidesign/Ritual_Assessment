alter table public.assessments
  drop constraint if exists assessments_language_check;

alter table public.assessments
  add constraint assessments_language_check
  check (language in ('en', 'fr', 'it', 'ar', 'bg', 'pl', 'tr', 'de', 'pt-PT'));
