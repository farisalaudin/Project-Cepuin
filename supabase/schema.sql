-- ============================
-- Cepuin -- Database Schema
-- Sesuai dengan kode program saat ini
-- Run this in Supabase SQL Editor
-- ============================

create extension if not exists pgcrypto;

-- =============================
-- TABLE: reports
-- =============================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (
    category in (
      'jalan_berlubang',
      'lampu_mati',
      'banjir',
      'sampah_menumpuk',
      'drainase_rusak',
      'fasilitas_umum',
      'lainnya'
    )
  ),
  description text,
  photo_url text,
  lat double precision not null,
  lng double precision not null,
  address text,
  status text not null default 'dilaporkan' check (
    status in (
      'dilaporkan',
      'diverifikasi',
      'dikerjakan',
      'selesai',
      'ditolak'
    )
  ),
  urgency_score numeric(5,2) not null default 0,
  vote_count integer not null default 0 check (vote_count >= 0),
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_location on public.reports (lat, lng);
create index if not exists idx_reports_urgency on public.reports (urgency_score desc);
create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_user_created on public.reports (user_id, created_at desc);
create index if not exists idx_reports_created_at on public.reports (created_at desc);

-- =============================
-- TABLE: votes
-- =============================
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now(),
  constraint votes_actor_required check (
    user_id is not null or nullif(btrim(session_id), '') is not null
  ),
  unique (report_id, user_id),
  unique (report_id, session_id)
);

create index if not exists idx_votes_report on public.votes (report_id);

-- =============================
-- TABLE: status_history
-- =============================
create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  old_status text check (
    old_status is null or old_status in (
      'dilaporkan',
      'diverifikasi',
      'dikerjakan',
      'selesai',
      'ditolak'
    )
  ),
  new_status text not null check (
    new_status in (
      'dilaporkan',
      'diverifikasi',
      'dikerjakan',
      'selesai',
      'ditolak'
    )
  ),
  changed_by text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint status_history_rejection_note check (
    new_status <> 'ditolak'
    or coalesce(nullif(btrim(note), ''), '') <> ''
  )
);

create index if not exists idx_status_history_report
  on public.status_history (report_id, created_at desc);

-- =============================
-- TABLE: user_profiles
-- Profil warga untuk username publik
-- =============================
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_username_length check (char_length(username) between 3 and 24),
  constraint user_profiles_username_format check (username ~ '^[a-z0-9_]+$')
);

create unique index if not exists idx_user_profiles_username_unique
  on public.user_profiles ((lower(username)));

create index if not exists idx_user_profiles_user
  on public.user_profiles (user_id);

-- =============================
-- FUNCTION: urgency calculation
-- Disamakan dengan src/lib/urgency.ts
-- vote_score = min(100, vote_count * 2)
-- =============================
create or replace function public.calculate_report_urgency(
  report_vote_count integer,
  report_category text,
  report_created_at timestamptz
)
returns numeric(5,2)
language plpgsql
as $$
declare
  category_score numeric;
  time_score numeric;
  vote_score numeric;
  days_since numeric;
begin
  category_score := case report_category
    when 'jalan_berlubang' then 90
    when 'lampu_mati' then 70
    when 'banjir' then 95
    when 'sampah_menumpuk' then 60
    when 'drainase_rusak' then 75
    when 'fasilitas_umum' then 55
    else 50
  end;

  days_since := greatest(
    0,
    extract(epoch from (now() - report_created_at)) / 86400.0
  );

  time_score := least(100, days_since * 3);
  vote_score := least(100, greatest(report_vote_count, 0) * 2);

  return round(
    least(
      100,
      (vote_score * 0.4) + (category_score * 0.4) + (time_score * 0.2)
    )::numeric,
    2
  );
end;
$$;

create or replace function public.set_initial_report_urgency()
returns trigger
language plpgsql
as $$
begin
  if new.created_at is null then
    new.created_at := now();
  end if;

  new.updated_at := coalesce(new.updated_at, new.created_at);
  new.urgency_score := public.calculate_report_urgency(
    coalesce(new.vote_count, 0),
    new.category,
    new.created_at
  );

  return new;
end;
$$;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.refresh_report_urgency(target_report_id uuid)
returns void
language plpgsql
as $$
begin
  update public.reports
  set urgency_score = public.calculate_report_urgency(
    vote_count,
    category,
    created_at
  )
  where id = target_report_id;
end;
$$;

create or replace function public.handle_vote_insert()
returns trigger
language plpgsql
as $$
begin
  update public.reports
  set vote_count = vote_count + 1
  where id = new.report_id;

  perform public.refresh_report_urgency(new.report_id);
  return new;
end;
$$;

drop trigger if exists trigger_reports_set_initial_urgency on public.reports;
create trigger trigger_reports_set_initial_urgency
before insert on public.reports
for each row
execute function public.set_initial_report_urgency();

drop trigger if exists trigger_reports_updated_at on public.reports;
create trigger trigger_reports_updated_at
before update on public.reports
for each row
execute function public.update_updated_at();

drop trigger if exists trigger_user_profiles_updated_at on public.user_profiles;
create trigger trigger_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.update_updated_at();

drop trigger if exists trigger_increment_votes on public.votes;
create trigger trigger_increment_votes
after insert on public.votes
for each row
execute function public.handle_vote_insert();

-- =============================
-- ROW LEVEL SECURITY (RLS)
-- Disamakan dengan email admin di app saat ini
-- src/app/login/page.tsx dan src/app/admin/layout.tsx
-- =============================
alter table public.reports enable row level security;
alter table public.votes enable row level security;
alter table public.status_history enable row level security;
alter table public.user_profiles enable row level security;

drop policy if exists "Anyone can read reports" on public.reports;
create policy "Anyone can read reports"
on public.reports
for select
using (true);

drop policy if exists "Anyone can insert reports" on public.reports;
create policy "Anyone can insert reports"
on public.reports
for insert
with check (true);

drop policy if exists "Admin can update reports" on public.reports;
create policy "Admin can update reports"
on public.reports
for update
using (
  auth.role() = 'service_role'
  or auth.jwt() ->> 'email' in ('admin@cepuin.id', 'test@admin.com')
)
with check (
  auth.role() = 'service_role'
  or auth.jwt() ->> 'email' in ('admin@cepuin.id', 'test@admin.com')
);

drop policy if exists "Anyone can read votes" on public.votes;
create policy "Anyone can read votes"
on public.votes
for select
using (true);

drop policy if exists "Anyone can vote" on public.votes;
create policy "Anyone can vote"
on public.votes
for insert
with check (true);

drop policy if exists "Anyone can read status history" on public.status_history;
create policy "Anyone can read status history"
on public.status_history
for select
using (true);

drop policy if exists "Admin can insert status history" on public.status_history;
create policy "Admin can insert status history"
on public.status_history
for insert
with check (
  auth.role() = 'service_role'
  or auth.jwt() ->> 'email' in ('admin@cepuin.id', 'test@admin.com')
);

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
using (
  auth.uid() = user_id
  or auth.role() = 'service_role'
  or auth.jwt() ->> 'email' in ('admin@cepuin.id', 'test@admin.com')
);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
on public.user_profiles
for insert
with check (
  auth.uid() = user_id
  or auth.role() = 'service_role'
);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
using (
  auth.uid() = user_id
  or auth.role() = 'service_role'
)
with check (
  auth.uid() = user_id
  or auth.role() = 'service_role'
);

-- =============================
-- STORAGE
-- Disamakan dengan src/lib/storage.ts
-- Bucket name: photos
-- =============================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view photos" on storage.objects;
create policy "Public can view photos"
on storage.objects
for select
using (bucket_id = 'photos');

drop policy if exists "Anyone can upload photos" on storage.objects;
create policy "Anyone can upload photos"
on storage.objects
for insert
with check (bucket_id = 'photos');
