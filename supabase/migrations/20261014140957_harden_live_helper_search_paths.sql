-- These helpers are callable by public access predicates. They do not access
-- unqualified relations, so pinning an empty search path removes a mutable
-- execution setting without changing the public participant flow.
begin;

create or replace function public.live_request_header(header_name text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  headers jsonb;
begin
  headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  return headers ->> lower(header_name);
exception when others then
  return null;
end;
$$;

create or replace function public.live_token_hash(token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when token is null or length(token) = 0 then null
    else encode(extensions.digest(token::text, 'sha256'::text), 'hex')
  end;
$$;

create or replace function public.live_request_participant_id()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  raw_id text;
begin
  raw_id := public.live_request_header('x-live-participant-id');
  if raw_id is null or raw_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return raw_id::uuid;
end;
$$;

revoke all on function public.live_request_header(text) from public, anon, authenticated;
revoke all on function public.live_token_hash(text) from public, anon, authenticated;
revoke all on function public.live_request_participant_id() from public, anon, authenticated;
grant execute on function public.live_request_header(text) to anon, authenticated;
grant execute on function public.live_token_hash(text) to anon, authenticated;
grant execute on function public.live_request_participant_id() to anon, authenticated;
notify pgrst, 'reload schema';
commit;
