-- Shared watchlist: pair-specific "watch together" list between two friends.
-- Canonical pair rule: user_a_id < user_b_id (lower UUID always first).

create table if not exists public.shared_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null,
  user_b_id uuid not null,
  tmdb_id integer not null,
  title text,
  year integer,
  poster text,
  director text,
  added_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_a_id, user_b_id, tmdb_id)
);

-- Index for fast pair lookups
create index if not exists idx_shared_watchlist_pair
  on public.shared_watchlist (user_a_id, user_b_id);

-- RLS: only members of the pair can read/write
alter table public.shared_watchlist enable row level security;

create policy "Users can read own shared watchlists"
  on public.shared_watchlist for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "Users can insert into own shared watchlists"
  on public.shared_watchlist for insert
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "Users can delete from own shared watchlists"
  on public.shared_watchlist for delete
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);
