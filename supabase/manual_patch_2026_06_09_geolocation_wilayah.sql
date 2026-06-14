-- Cepuin incremental patch
-- Fokus: GPS asli, reverse geocoding wilayah, admin per wilayah, dan statistik penanganan.
-- Jalankan pada database Supabase yang sudah memiliki schema Cepuin saat ini.

create extension if not exists pgcrypto;

create table if not exists public.wilayah (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  tipe text not null check (tipe in ('kota', 'kabupaten')),
  provinsi text not null,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint wilayah_nama_provinsi_unique unique (nama, provinsi)
);

create table if not exists public.admin (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  wilayah_id uuid references public.wilayah(id) on delete set null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

insert into public.wilayah (nama, tipe, provinsi, keywords)
values
  ('Kota Malang', 'kota', 'Jawa Timur', array['kota malang', 'malang kota']),
  ('Kab. Malang', 'kabupaten', 'Jawa Timur', array['kabupaten malang', 'malang kabupaten', 'kab. malang']),
  ('Kota Bekasi', 'kota', 'Jawa Barat', array['kota bekasi', 'bekasi kota'])
on conflict (nama, provinsi) do update
set
  tipe = excluded.tipe,
  keywords = excluded.keywords;

insert into public.admin (email, wilayah_id)
select seed.email, wilayah.id
from (
  values
    ('kotamalang@cepuin.id', 'Kota Malang', 'Jawa Timur'),
    ('kabmalang@cepuin.id', 'Kab. Malang', 'Jawa Timur'),
    ('kotabekasi@cepuin.id', 'Kota Bekasi', 'Jawa Barat')
) as seed(email, wilayah_nama, wilayah_provinsi)
join public.wilayah
  on wilayah.nama = seed.wilayah_nama
 and wilayah.provinsi = seed.wilayah_provinsi
on conflict (email) do update
set wilayah_id = excluded.wilayah_id;

alter table public.reports
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists gps_accuracy numeric,
  add column if not exists kelurahan text,
  add column if not exists kecamatan text,
  add column if not exists kabupaten text,
  add column if not exists provinsi text,
  add column if not exists wilayah_id uuid references public.wilayah(id) on delete set null,
  add column if not exists processed_at timestamptz,
  add column if not exists resolved_at timestamptz;

update public.reports
set
  latitude = coalesce(latitude, round(lat::numeric, 7)),
  longitude = coalesce(longitude, round(lng::numeric, 7))
where latitude is null
   or longitude is null;

create index if not exists idx_reports_wilayah_status
  on public.reports (wilayah_id, status);

create index if not exists idx_reports_wilayah_urgency
  on public.reports (wilayah_id, urgency_score desc);

create index if not exists idx_admin_email
  on public.admin (email);

create index if not exists idx_admin_wilayah
  on public.admin (wilayah_id);

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
    )
    or exists (
      select 1
      from public.admin
      where email = auth.jwt() ->> 'email'
    );
$$;

create or replace function public.current_admin_wilayah_id()
returns uuid
language sql
stable
as $$
  select wilayah_id
  from public.admin
  where email = auth.jwt() ->> 'email'
  limit 1;
$$;

drop function if exists public.submit_report(
  text,
  text,
  smallint,
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
  report_gps_accuracy numeric,
  report_address text,
  report_kelurahan text,
  report_kecamatan text,
  report_kabupaten text,
  report_provinsi text,
  report_wilayah_id uuid
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
    latitude,
    longitude,
    gps_accuracy,
    address,
    kelurahan,
    kecamatan,
    kabupaten,
    provinsi,
    wilayah_id,
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
    round(report_lat::numeric, 7),
    round(report_lng::numeric, 7),
    report_gps_accuracy,
    nullif(btrim(report_address), ''),
    nullif(btrim(report_kelurahan), ''),
    nullif(btrim(report_kecamatan), ''),
    nullif(btrim(report_kabupaten), ''),
    nullif(btrim(report_provinsi), ''),
    report_wilayah_id,
    'dilaporkan',
    0
  )
  returning * into new_report;

  return new_report;
end;
$$;

create or replace function public.admin_update_report_status(
  target_report_id uuid,
  target_status text,
  actor_assigned_to text default null,
  actor_note text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
  effective_note text;
  updated_report public.reports;
  actor_email text;
  actor_wilayah_id uuid;
begin
  if not public.is_admin_actor() then
    raise exception 'Akses admin ditolak.'
      using errcode = '42501';
  end if;

  actor_email := coalesce(auth.jwt() ->> 'email', 'Admin');
  actor_wilayah_id := public.current_admin_wilayah_id();
  effective_note := nullif(btrim(actor_note), '');

  select status
  into previous_status
  from public.reports
  where id = target_report_id
    and (
      auth.role() = 'service_role'
      or actor_wilayah_id is null
      or wilayah_id = actor_wilayah_id
    )
  for update;

  if previous_status is null then
    raise exception 'Laporan tidak ditemukan atau bukan wilayah admin ini.'
      using errcode = 'P0002';
  end if;

  if effective_note is null then
    effective_note := case
      when nullif(btrim(actor_assigned_to), '') is not null
        then 'Petugas ditunjuk: ' || btrim(actor_assigned_to)
      else 'Status diperbarui ke ' || target_status
    end;
  end if;

  update public.reports
  set
    status = target_status,
    assigned_to = nullif(btrim(actor_assigned_to), ''),
    processed_at = case
      when target_status in ('diverifikasi', 'dikerjakan') and processed_at is null then now()
      else processed_at
    end,
    resolved_at = case
      when target_status = 'selesai' then now()
      when target_status <> 'selesai' then null
      else resolved_at
    end,
    updated_at = now()
  where id = target_report_id
  returning * into updated_report;

  insert into public.status_history (
    report_id,
    old_status,
    new_status,
    changed_by,
    note
  )
  values (
    target_report_id,
    previous_status,
    target_status,
    actor_email,
    effective_note
  );

  return updated_report;
end;
$$;

alter table public.wilayah enable row level security;
alter table public.admin enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Anyone can read wilayah" on public.wilayah;
create policy "Anyone can read wilayah"
on public.wilayah
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can read own admin row" on public.admin;
create policy "Admins can read own admin row"
on public.admin
for select
to authenticated
using (
  email = auth.jwt() ->> 'email'
  or auth.role() = 'service_role'
);

drop policy if exists "admin_read_own_wilayah" on public.reports;
create policy "admin_read_own_wilayah"
on public.reports
for select
to authenticated
using (
  wilayah_id = public.current_admin_wilayah_id()
);

drop policy if exists "admin_update_own_wilayah" on public.reports;
create policy "admin_update_own_wilayah"
on public.reports
for update
to authenticated
using (
  wilayah_id = public.current_admin_wilayah_id()
);

drop policy if exists "user_insert_laporan" on public.reports;
create policy "user_insert_laporan"
on public.reports
for insert
to anon, authenticated
with check (true);

drop policy if exists "user_read_laporan" on public.reports;
create policy "user_read_laporan"
on public.reports
for select
to anon, authenticated
using (true);
