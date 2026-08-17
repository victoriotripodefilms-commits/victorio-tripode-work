-- Victorio Tripode Work - esquema inicial para Supabase
create extension if not exists pgcrypto;

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin text not null check (origin in ('propio','productora')),
  event_type text,
  service text,
  event_date date not null,
  start_time time,
  end_time time,
  venue text,
  city text,
  contractor text,
  honorees text,
  phone text,
  guests integer,
  payment_mode text,
  producer text,
  producer_contact text,
  own_vehicle boolean,
  due_date date,
  status text,
  total numeric(14,2) default 0,
  paid numeric(14,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists job_costs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  hours numeric(8,2) default 0,
  amount numeric(14,2) default 0,
  created_at timestamptz default now()
);

alter table jobs enable row level security;
alter table job_costs enable row level security;

create policy "users manage own jobs" on jobs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own costs" on job_costs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
