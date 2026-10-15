begin;

-- This function is invoked exclusively by the database trigger; it is not an RPC endpoint.
revoke all on function public.validate_scheduling_response() from public, anon, authenticated;

commit;
