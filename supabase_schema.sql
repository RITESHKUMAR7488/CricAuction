-- Elite League Cricket Auction - Supabase Schema with Auth & RBAC

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (stores additional user data linked to auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  created_at timestamptz default now()
);

-- Settings table (singleton)
create table if not exists settings (
  id integer primary key default 1,
  league_name text not null default 'ELITE LEAGUE',
  active_auction_id uuid,
  constraint single_row check (id = 1)
);
insert into settings (id, league_name) values (1, 'ELITE LEAGUE') on conflict (id) do nothing;

-- Auctions table
create table if not exists auctions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  status text not null default 'active', -- active, completed
  created_at timestamptz default now()
);

-- Add new columns if table already existed
alter table auctions add column if not exists host_id uuid references auth.users(id);
alter table auctions add column if not exists join_code text unique;

-- Auction Members table
create table if not exists auction_members (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references auctions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(auction_id, user_id)
);

-- Owners table (global)
create table if not exists owners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company text,
  photo_url text,
  created_at timestamptz default now()
);

-- Sponsors table (global)
create table if not exists sponsors (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  name text not null,
  logo_url text,
  contact_person text,
  contact_role text,
  contact_photo_url text,
  deal_value numeric default 0,
  sponsor_since integer default 2024,
  created_at timestamptz default now()
);

-- Teams table (per auction)
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references auctions(id) on delete cascade,
  name text not null,
  owner_id uuid references owners(id),
  total_purse numeric not null default 100,
  max_players integer not null default 10,
  logo_url text,
  color text default '#4a9eff',
  created_at timestamptz default now()
);

-- Players table (per auction)
create table if not exists players (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references auctions(id) on delete cascade,
  code text not null,
  name text not null,
  role text not null,
  age integer,
  style text,
  matches integer default 0,
  strike_rate numeric,
  economy numeric,
  base_price numeric not null default 1,
  photo_url text,
  status text not null default 'available',
  team_id uuid references teams(id),
  sold_price numeric,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table settings enable row level security;
alter table auctions enable row level security;
alter table auction_members enable row level security;
alter table owners enable row level security;
alter table sponsors enable row level security;
alter table teams enable row level security;
alter table players enable row level security;

-- Policies for Profiles
drop policy if exists "Users can read all profiles" on profiles;
create policy "Users can read all profiles" on profiles for select using (auth.role() = 'authenticated');
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Policies for Settings
drop policy if exists "Public settings read" on settings;
create policy "Public settings read" on settings for select using (true);
drop policy if exists "Auth settings update" on settings;
create policy "Auth settings update" on settings for update using (auth.role() = 'authenticated');

-- Policies for Auctions
drop policy if exists "Auctions read access" on auctions;
create policy "Auctions read access" on auctions for select using (
  auth.uid() = host_id OR 
  exists (select 1 from auction_members where auction_id = auctions.id and user_id = auth.uid())
);
drop policy if exists "Auctions insert" on auctions;
create policy "Auctions insert" on auctions for insert with check (auth.uid() = host_id);
drop policy if exists "Auctions update" on auctions;
create policy "Auctions update" on auctions for update using (auth.uid() = host_id);
drop policy if exists "Auctions delete" on auctions;
create policy "Auctions delete" on auctions for delete using (auth.uid() = host_id);

-- Policies for Auction Members
drop policy if exists "Members read" on auction_members;
drop policy if exists "Members read" on auction_members;
create policy "Members read" on auction_members for select using (auth.role() = 'authenticated');
drop policy if exists "Members insert" on auction_members;
create policy "Members insert" on auction_members for insert with check (auth.uid() = user_id);
drop policy if exists "Members delete" on auction_members;
create policy "Members delete" on auction_members for delete using (auth.uid() = user_id OR exists (select 1 from auctions where id = auction_members.auction_id and host_id = auth.uid()));

-- Policies for Owners & Sponsors (Global resources)
drop policy if exists "Auth owners read" on owners;
create policy "Auth owners read" on owners for select using (auth.role() = 'authenticated');
drop policy if exists "Auth owners all" on owners;
create policy "Auth owners all" on owners for all using (auth.role() = 'authenticated');
drop policy if exists "Auth sponsors read" on sponsors;
create policy "Auth sponsors read" on sponsors for select using (auth.role() = 'authenticated');
drop policy if exists "Auth sponsors all" on sponsors;
create policy "Auth sponsors all" on sponsors for all using (auth.role() = 'authenticated');

-- Policies for Teams
drop policy if exists "Teams read" on teams;
create policy "Teams read" on teams for select using (
  exists (select 1 from auctions where id = teams.auction_id and (host_id = auth.uid() or exists (select 1 from auction_members where auction_id = auctions.id and user_id = auth.uid())))
);
drop policy if exists "Teams mod" on teams;
create policy "Teams mod" on teams for all using (
  exists (select 1 from auctions where id = teams.auction_id and host_id = auth.uid())
);

-- Policies for Players
drop policy if exists "Players read" on players;
create policy "Players read" on players for select using (
  exists (select 1 from auctions where id = players.auction_id and (host_id = auth.uid() or exists (select 1 from auction_members where auction_id = auctions.id and user_id = auth.uid())))
);
drop policy if exists "Players mod" on players;
create policy "Players mod" on players for all using (
  exists (select 1 from auctions where id = players.auction_id and host_id = auth.uid())
);

-- Storage bucket for photos (public read, auth insert)
insert into storage.buckets (id, name, public) values ('cricket-auction', 'cricket-auction', true) on conflict (id) do nothing;
drop policy if exists "Public storage read" on storage.objects;
create policy "Public storage read" on storage.objects for select using (bucket_id = 'cricket-auction');
drop policy if exists "Auth storage insert" on storage.objects;
create policy "Auth storage insert" on storage.objects for insert with check (bucket_id = 'cricket-auction' and auth.role() = 'authenticated');
drop policy if exists "Auth storage update" on storage.objects;
create policy "Auth storage update" on storage.objects for update using (bucket_id = 'cricket-auction' and auth.role() = 'authenticated');
drop policy if exists "Auth storage delete" on storage.objects;
create policy "Auth storage delete" on storage.objects for delete using (bucket_id = 'cricket-auction' and auth.role() = 'authenticated');
-- Function to join an auction by code
create or replace function join_auction_by_code(p_join_code text)
returns uuid
language plpgsql
security definer
as $body$
declare
  v_auction_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_auction_id from auctions where join_code = p_join_code;
  
  if v_auction_id is null then
    raise exception 'Invalid join code';
  end if;

  if not exists (select 1 from auctions where id = v_auction_id and host_id = v_user_id) then
    insert into auction_members (auction_id, user_id) 
    values (v_auction_id, v_user_id) 
    on conflict do nothing;
  end if;

  return v_auction_id;
end;
$body$;
