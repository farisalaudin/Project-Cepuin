-- =============================================================================
-- Cepuin incremental patch — 2026-06-14
-- Fokus: Reporter GPS (audit metadata), jarak haversine, risk_flag, disclaimer
--
-- PRINSIP: Reporter GPS TIDAK menentukan wilayah/routing laporan.
--          Digunakan hanya untuk audit internal & deteksi risiko.
--
-- Jalankan SETELAH:
--   1. supabase/manual_patch_2026_05_14.sql
--   2. supabase/manual_patch_2026_06_09_geolocation_wilayah.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tambah kolom reporter GPS ke tabel reports
--    (semua nullable — laporan tetap valid tanpa reporter GPS)
-- ---------------------------------------------------------------------------

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reporter_lat         NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS reporter_lon         NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS reporter_accuracy    NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS reporter_gps_timestamp TIMESTAMPTZ,
  -- Auto-calculated by trigger (haversine pin vs reporter)
  ADD COLUMN IF NOT EXISTS jarak_pelapor_km     NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS risk_flag            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS risk_note            TEXT,
  -- Disclaimer consent (required for all new reports)
  ADD COLUMN IF NOT EXISTS disclaimer_agreed    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disclaimer_agreed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. Index untuk mempercepat query risk_flag di dashboard admin
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_reports_risk_flag
  ON public.reports (risk_flag)
  WHERE risk_flag = TRUE;

-- ---------------------------------------------------------------------------
-- 3. Fungsi Haversine — hitung jarak dalam KM antara dua titik GPS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r    NUMERIC := 6371; -- Radius bumi dalam km
  dlat NUMERIC := radians(lat2 - lat1);
  dlon NUMERIC := radians(lon2 - lon1);
  a    NUMERIC;
BEGIN
  a := sin(dlat / 2) ^ 2
     + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ^ 2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Trigger function — hitung jarak & set risk_flag otomatis saat INSERT
--    (BEFORE INSERT agar bisa modifikasi NEW sebelum disimpan)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_jarak_dan_risk()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  threshold_km CONSTANT NUMERIC := 50;
BEGIN
  -- Hanya hitung jika reporter GPS tersedia
  IF NEW.reporter_lat IS NOT NULL AND NEW.reporter_lon IS NOT NULL THEN
    NEW.jarak_pelapor_km := round(
      public.haversine_km(
        NEW.reporter_lat::NUMERIC,
        NEW.reporter_lon::NUMERIC,
        NEW.lat::NUMERIC,
        NEW.lng::NUMERIC
      ),
      3
    );

    IF NEW.jarak_pelapor_km > threshold_km THEN
      NEW.risk_flag := TRUE;
      NEW.risk_note := format(
        'Jarak pelapor ke lokasi kejadian melebihi %s km (terdeteksi: %s km)',
        threshold_km,
        NEW.jarak_pelapor_km
      );
    END IF;
  END IF;

  -- Pastikan risk_flag selalu boolean (bukan null)
  NEW.risk_flag := COALESCE(NEW.risk_flag, FALSE);

  RETURN NEW;
END;
$$;

-- Hapus trigger lama jika ada, lalu buat ulang
DROP TRIGGER IF EXISTS trg_jarak_risk ON public.reports;

CREATE TRIGGER trg_jarak_risk
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_jarak_dan_risk();

-- ---------------------------------------------------------------------------
-- 5. Update RPC submit_report — tambah parameter reporter GPS & disclaimer
--
--    Patch juni sudah drop & recreate submit_report dengan parameter geocoding.
--    Patch ini drop ulang & tambah parameter reporter GPS + disclaimer.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.submit_report(
  text, text, smallint, text, text,
  double precision, double precision, numeric,
  text, text, text, text, text, uuid
);

CREATE OR REPLACE FUNCTION public.submit_report(
  -- Konten laporan
  report_category          TEXT,
  report_description       TEXT,
  report_rating            SMALLINT,
  report_feedback_comment  TEXT,
  report_photo_url         TEXT,

  -- Lokasi kejadian (pin — penentu wilayah routing)
  report_lat               DOUBLE PRECISION,
  report_lng               DOUBLE PRECISION,
  report_gps_accuracy      NUMERIC,
  report_address           TEXT,
  report_kelurahan         TEXT,
  report_kecamatan         TEXT,
  report_kabupaten         TEXT,
  report_provinsi          TEXT,
  report_wilayah_id        UUID,

  -- GPS pelapor (audit metadata only — bukan penentu wilayah)
  report_reporter_lat              DOUBLE PRECISION DEFAULT NULL,
  report_reporter_lon              DOUBLE PRECISION DEFAULT NULL,
  report_reporter_accuracy         NUMERIC          DEFAULT NULL,
  report_reporter_gps_timestamp    TIMESTAMPTZ      DEFAULT NULL,

  -- Disclaimer consent
  report_disclaimer_agreed         BOOLEAN          DEFAULT FALSE,
  report_disclaimer_agreed_at      TIMESTAMPTZ      DEFAULT NULL
)
RETURNS public.reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_report     public.reports;
  found_duplicate public.reports;
BEGIN
  -- Advisory lock untuk mencegah race condition duplikat
  PERFORM public.lock_duplicate_report_cells(
    report_category,
    report_lat,
    report_lng
  );

  -- Cek duplikat di DB level
  SELECT *
    INTO found_duplicate
    FROM public.find_nearby_open_duplicate_report(
      report_category,
      report_lat,
      report_lng
    );

  IF found_duplicate.id IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_REPORT_LOCKED'
      USING ERRCODE = 'P0001';
  END IF;

  -- Validasi disclaimer wajib disetujui
  IF NOT COALESCE(report_disclaimer_agreed, FALSE) THEN
    RAISE EXCEPTION 'Disclaimer lokasi kejadian wajib disetujui sebelum mengirim laporan.'
      USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO public.reports (
    user_id,
    category,
    description,
    rating,
    feedback_comment,
    photo_url,

    -- Lokasi kejadian (pin)
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

    -- GPS pelapor (audit — trigger akan hitung jarak & risk_flag)
    reporter_lat,
    reporter_lon,
    reporter_accuracy,
    reporter_gps_timestamp,

    -- Disclaimer
    disclaimer_agreed,
    disclaimer_agreed_at,

    status,
    vote_count
  )
  VALUES (
    auth.uid(),
    report_category,
    nullif(btrim(report_description), ''),
    report_rating,
    nullif(btrim(report_feedback_comment), ''),
    nullif(btrim(report_photo_url), ''),

    report_lat,
    report_lng,
    round(report_lat::NUMERIC, 7),
    round(report_lng::NUMERIC, 7),
    report_gps_accuracy,
    nullif(btrim(report_address), ''),
    nullif(btrim(report_kelurahan), ''),
    nullif(btrim(report_kecamatan), ''),
    nullif(btrim(report_kabupaten), ''),
    nullif(btrim(report_provinsi), ''),
    report_wilayah_id,

    report_reporter_lat,
    report_reporter_lon,
    report_reporter_accuracy,
    report_reporter_gps_timestamp,

    COALESCE(report_disclaimer_agreed, FALSE),
    report_disclaimer_agreed_at,

    'dilaporkan',
    0
  )
  RETURNING * INTO new_report;

  RETURN new_report;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Berikan akses EXECUTE ke anon & authenticated (laporan publik tanpa login)
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.submit_report(
  text, text, smallint, text, text,
  double precision, double precision, numeric,
  text, text, text, text, text, uuid,
  double precision, double precision, numeric, timestamptz,
  boolean, timestamptz
) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Konfirmasi patch selesai
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE 'Patch 2026-06-14 berhasil dijalankan.';
  RAISE NOTICE '  + Kolom reporter GPS, jarak_pelapor_km, risk_flag, disclaimer ditambahkan ke reports';
  RAISE NOTICE '  + Fungsi haversine_km tersedia';
  RAISE NOTICE '  + Trigger trg_jarak_risk aktif (BEFORE INSERT)';
  RAISE NOTICE '  + RPC submit_report diperbarui dengan parameter reporter GPS & disclaimer';
END;
$$;
