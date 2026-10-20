-- Player profiles are keyed to Supabase Auth users. Passwords and auth tokens are never stored here.
create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.player_profiles enable row level security;
drop policy if exists "Players can read their own profile" on public.player_profiles;
create policy "Players can read their own profile" on public.player_profiles
  for select to authenticated using (auth.uid() = id);
drop policy if exists "Players can create their own profile" on public.player_profiles;
create policy "Players can create their own profile" on public.player_profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Players can update their own profile" on public.player_profiles;
create policy "Players can update their own profile" on public.player_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
grant select, insert, update on public.player_profiles to authenticated;
