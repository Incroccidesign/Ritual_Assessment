create table if not exists public.dashboard_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('individual', 'collective')),
  resource_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_type, resource_id)
);

alter table public.dashboard_favorites enable row level security;

grant select, insert, delete on public.dashboard_favorites to authenticated;

create policy "Users read their dashboard favorites"
  on public.dashboard_favorites for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their dashboard favorites"
  on public.dashboard_favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users remove their dashboard favorites"
  on public.dashboard_favorites for delete to authenticated
  using ((select auth.uid()) = user_id);
