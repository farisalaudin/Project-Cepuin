-- Cepuin incremental patch
-- Jalankan file ini pada database Supabase yang SUDAH ada
-- Fokus: rating + feedback, formula urgency, admin_users, dan hardening auth admin

create extension if not exists pgcrypto;

alter table public.reports
  add column if not exists rating smallint,
  add column if not exists feedback_comment text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_rating_range'
  ) then
    alter table public.reports
      add constraint reports_rating_range
      check (rating is null or rating between 1 and 5);
  end if;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_users_created_at
  on public.admin_users (created_at desc);

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

  return round(
    least(
      100,
      (greatest(report_vote_count, 0) * 0.4) + (category_score * 0.4) + (time_score * 0.2)
    )::numeric,
    2
  );
end;
$$;

update public.reports
set urgency_score = public.calculate_report_urgency(
  vote_count,
  category,
  created_at
);

create or replace function public.lock_duplicate_report_cells(
  report_category text,
  report_lat double precision,
  report_lng double precision
)
returns void
language plpgsql
as $$
declare
  radius_degrees constant double precision := 0.00045;
  base_lat_bucket integer := floor(report_lat / radius_degrees);
  base_lng_bucket integer := floor(report_lng / radius_degrees);
  lat_offset integer;
  lng_offset integer;
begin
  for lat_offset in -1..1 loop
    for lng_offset in -1..1 loop
      perform pg_advisory_xact_lock(
        hashtext(report_category),
        hashtext((base_lat_bucket + lat_offset)::text || ':' || (base_lng_bucket + lng_offset)::text)
      );
    end loop;
  end loop;
end;
$$;

create or replace function public.find_nearby_open_duplicate_report(
  report_category text,
  report_lat double precision,
  report_lng double precision
)
returns public.reports
language sql
stable
as $$
  with candidate_reports as (
    select *
    from public.reports
    where category = report_category
      and status in ('dilaporkan', 'diverifikasi', 'dikerjakan')
      and lat between report_lat - 0.00045 and report_lat + 0.00045
      and lng between report_lng - 0.00045 and report_lng + 0.00045
  )
  select *
  from candidate_reports
  where (
    6371000 * 2 * atan2(
      sqrt(
        power(sin(radians(lat - report_lat) / 2), 2) +
        cos(radians(report_lat)) * cos(radians(lat)) *
        power(sin(radians(lng - report_lng) / 2), 2)
      ),
      sqrt(
        1 - (
          power(sin(radians(lat - report_lat) / 2), 2) +
          cos(radians(report_lat)) * cos(radians(lat)) *
          power(sin(radians(lng - report_lng) / 2), 2)
        )
      )
    )
  ) <= 50
  order by created_at desc
  limit 1;
$$;

drop function if exists public.submit_report(
  text,
  text,
  text,
  double precision,
  double precision,
  text
);

create or replace function public.submit_report(
  report_category text,
  report_description text,
  report_rating smallint,
  report_feedback_comment text,
  report_photo_url text,
  report_lat double precision,
  report_lng double precision,
  report_address text
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  new_report public.reports;
  found_duplicate public.reports;
begin
  perform public.lock_duplicate_report_cells(
    report_category,
    report_lat,
    report_lng
  );

  select *
  into found_duplicate
  from public.find_nearby_open_duplicate_report(
    report_category,
    report_lat,
    report_lng
  );

  if found_duplicate.id is not null then
    raise exception 'DUPLICATE_REPORT_LOCKED'
      using errcode = 'P0001';
  end if;

  insert into public.reports (
    user_id,
    category,
    description,
    rating,
    feedback_comment,
    photo_url,
    lat,
    lng,
    address,
    status,
    vote_count
  )
  values (
    auth.uid(),
    report_category,
    nullif(btrim(report_description), ''),
    report_rating,
    nullif(btrim(report_feedback_comment), ''),
    nullif(btrim(report_photo_url), ''),
    report_lat,
    report_lng,
    nullif(btrim(report_address), ''),
    'dilaporkan',
    0
  )
  returning * into new_report;

  return new_report;
end;
$$;

create or replace function public.is_admin_actor()
returns boolean
language sql
stable
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.admin_users
      where user_id = auth.uid()
    );
$$;

alter table public.admin_users enable row level security;

drop policy if exists "Users can read own admin membership" on public.admin_users;
create policy "Users can read own admin membership"
on public.admin_users
for select
using (
  auth.uid() = user_id
  or auth.role() = 'service_role'
);

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
using (
  auth.uid() = user_id
  or auth.role() = 'service_role'
  or exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  )
);

-- Seed admin pertama:
-- Ganti email di bawah dengan akun admin kamu, lalu jalankan blok ini sekali.
-- insert into public.admin_users (user_id)
-- select id
-- from auth.users
-- where email = 'admin@contoh.com'
-- on conflict (user_id) do nothing;
