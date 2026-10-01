-- ====================================================================
-- CNTXT / TailorCraft Supabase Schema & Row Level Security (RLS)
-- ====================================================================

-- 1. Profiles Table (Extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default 'User',
  email text not null default '',
  avatar_url text,
  provider text default 'google',
  role text default 'Member',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. Automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url, provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    coalesce(new.raw_app_meta_data->>'provider', 'google')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. User Library Items (Personal Prompts & Skills)
create table if not exists public.user_library_items (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('prompt', 'skill')),
  category text not null,
  description text default '',
  author text not null,
  source text default 'user-authored',
  target_ais text[] default array[]::text[],
  fields jsonb default '[]'::jsonb,
  template text not null,
  is_favorite boolean default false,
  is_forked boolean default false,
  forked_from text,
  collection_id text,
  collection_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_library_items enable row level security;

create policy "Users can view their own library items" on public.user_library_items
  for select using (auth.uid() = user_id);

create policy "Users can insert their own library items" on public.user_library_items
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own library items" on public.user_library_items
  for update using (auth.uid() = user_id);

create policy "Users can delete their own library items" on public.user_library_items
  for delete using (auth.uid() = user_id);

-- 4. User Library Collections
create table if not exists public.library_collections (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text default '',
  category text not null,
  author text not null,
  source text default 'user-authored',
  tags text[] default array[]::text[],
  item_ids text[] default array[]::text[],
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.library_collections enable row level security;

create policy "Users can view their own collections" on public.library_collections
  for select using (auth.uid() = user_id);

create policy "Users can insert their own collections" on public.library_collections
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own collections" on public.library_collections
  for update using (auth.uid() = user_id);

create policy "Users can delete their own collections" on public.library_collections
  for delete using (auth.uid() = user_id);

-- 5. Community Library Items (Catalog accessible to all users)
create table if not exists public.community_library_items (
  id text primary key,
  name text not null,
  type text not null check (type in ('prompt', 'skill')),
  category text not null,
  description text default '',
  author text not null,
  author_badge text default 'Community Contributor',
  downloads integer default 0,
  rating numeric(3,2) default 5.0,
  target_ais text[] default array[]::text[],
  fields jsonb default '[]'::jsonb,
  template text not null,
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.community_library_items enable row level security;

create policy "Community library items are viewable by anyone" on public.community_library_items
  for select using (true);

create policy "Authenticated users can submit community items" on public.community_library_items
  for insert with check (auth.role() = 'authenticated');
