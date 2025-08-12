-- Create fantasy_team_prices table to store dynamic prices per round and team
create table if not exists public.fantasy_team_prices (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null,
  team_type text not null check (team_type in ('pro','amateur')),
  team_id text not null,
  team_name text,
  price numeric not null default 0,
  recent_win_rate numeric,
  match_volume integer,
  abandon_rate numeric,
  last_price_update timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, team_type, team_id)
);

-- Enable RLS and allow public read
alter table public.fantasy_team_prices enable row level security;
create policy "Fantasy team prices are publicly readable" on public.fantasy_team_prices
for select using (true);

-- Trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace trigger trg_fantasy_team_prices_updated
before update on public.fantasy_team_prices
for each row execute function public.set_updated_at();

-- Optional seed test data for the first available round if none exist for that round
-- This inserts sample prices matching the specification (only if a round exists)
DO $$
DECLARE r_id uuid;
BEGIN
  select id into r_id from public.fantasy_rounds where status in ('open','active') order by start_date asc limit 1;
  IF r_id is not null THEN
    -- Pro sample teams
    insert into public.fantasy_team_prices (round_id, team_type, team_id, team_name, price, recent_win_rate, match_volume)
    values
      (r_id, 'pro', 'team-liquid', 'Team Liquid', 20, 0.85, 6),
      (r_id, 'pro', 'g2-esports', 'G2 Esports', 20, 0.70, 5),
      (r_id, 'pro', 'og', 'OG', 19, 0.60, 5),
      (r_id, 'pro', 'fnatic', 'Fnatic', 16, 0.50, 4)
    on conflict (round_id, team_type, team_id) do nothing;

    -- Amateur sample teams
    insert into public.fantasy_team_prices (round_id, team_type, team_id, team_name, price, recent_win_rate, abandon_rate)
    values
      (r_id, 'amateur', 'redfox', 'RedFox', 5, 0.65, 0.10),
      (r_id, 'amateur', 'night-owls', 'Night Owls', 5, 0.55, 0.20),
      (r_id, 'amateur', 'frostbite', 'FrostBite', 5, 0.45, 0.05),
      (r_id, 'amateur', 'iron-wolves', 'Iron Wolves', 5, 0.30, 0.00)
    on conflict (round_id, team_type, team_id) do nothing;
  END IF;
END $$;