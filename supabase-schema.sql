-- Run this in your Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Decks table
create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

-- Cards table
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks on delete cascade not null,
  front text not null,
  back text not null,
  created_at timestamptz default now()
);

-- Row Level Security (users can only see/edit their own data)
alter table decks enable row level security;
alter table cards enable row level security;

create policy "Users manage their own decks" on decks
  for all using (auth.uid() = user_id);

create policy "Users manage cards in their decks" on cards
  for all using (
    deck_id in (select id from decks where user_id = auth.uid())
  );
