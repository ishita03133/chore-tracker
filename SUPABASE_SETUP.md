# 🚀 Supabase Setup Guide

## Step 1: Create Your Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose a name (e.g., "chore-tracker")
4. Set a strong database password
5. Select a region close to you
6. Wait for project to finish setting up (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string under "Project API keys")

3. Open `.env.local` in this project and paste:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-long-anon-key-here
   ```

## Step 3: Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste this entire SQL script:

```sql
-- Create households table (represents a shared space for roommates)
create table households (
  id text primary key,
  created_at timestamp default now()
);

-- Create profiles table (represents individual users)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  household_id text references households (id),
  created_at timestamp default now()
);

-- Create assignees table (roommates who can be assigned to chores)
create table assignees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  household_id text references households (id),
  created_at timestamp default now()
);

-- Create categories table (organize chores by category)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  household_id text references households (id),
  assignee_ids text[] default array[]::text[],
  created_at timestamp default now()
);

-- Create chores table (the actual tasks)
create table chores (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_id uuid references categories (id),
  assignee_ids text[] default array[]::text[],
  household_id text references households (id),
  completed boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Enable Row Level Security (RLS) for all tables
alter table households enable row level security;
alter table profiles enable row level security;
alter table assignees enable row level security;
alter table categories enable row level security;
alter table chores enable row level security;

-- Create policies to allow users to access data in their household
-- For now, we'll make it simple: anyone can read/write (we'll secure this later with proper auth)
create policy "Anyone can view households" on households for select using (true);
create policy "Anyone can create households" on households for insert with check (true);

create policy "Anyone can view profiles" on profiles for select using (true);
create policy "Anyone can create profiles" on profiles for insert with check (true);

create policy "Users can view assignees in their household" on assignees for select using (true);
create policy "Users can create assignees" on assignees for insert with check (true);
create policy "Users can update assignees" on assignees for update using (true);
create policy "Users can delete assignees" on assignees for delete using (true);

create policy "Users can view categories in their household" on categories for select using (true);
create policy "Users can create categories" on categories for insert with check (true);
create policy "Users can update categories" on categories for update using (true);
create policy "Users can delete categories" on categories for delete using (true);

create policy "Users can view chores in their household" on chores for select using (true);
create policy "Users can create chores" on chores for insert with check (true);
create policy "Users can update chores" on chores for update using (true);
create policy "Users can delete chores" on chores for delete using (true);
```

4. Click **Run** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

## Step 4: Restart Your Dev Server

After adding your keys to `.env.local`:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 5: Test Connection

The app will automatically connect to Supabase once the keys are set.
You can verify it's working when you start using the auth flow!

---

## 🔒 Security Note

The current setup uses simple RLS policies that allow anyone to read/write.
This is fine for a trusted household app with a shared code.

Later, when you add proper auth, you can update the policies to restrict access based on `household_id` matching.

---

## ✅ Next Steps

Once this is done, the app will:
1. Show a login screen asking for your name + household code
2. Store chores in Supabase (instead of localStorage)
3. Enable real-time updates when roommates make changes
4. Allow multiple devices to stay in sync

**You're building something real now!** 🎉

