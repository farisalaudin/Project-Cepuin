-- ============================================================
-- Cepuin — Dual Location Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to reports table
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS reporter_lat          NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS reporter_lon          NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS reporter_accuracy     NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS reporter_gps_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS jarak_pelapor_km      NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS risk_flag             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS risk_note             TEXT,
  ADD COLUMN IF NOT EXISTS disclaimer_agreed     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disclaimer_agreed_at  TIMESTAMPTZ;

-- 2. Haversine distance function (km)
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 NUMERIC, lon1 NUMERIC, lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  r    NUMERIC := 6371;
  dlat NUMERIC := radians(lat2 - lat1);
  dlon NUMERIC := radians(lon2 - lon1);
  a    NUMERIC;
BEGIN
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Trigger function: auto-calculate jarak & set risk_flag
CREATE OR REPLACE FUNCTION set_jarak_dan_risk() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reporter_lat IS NOT NULL AND NEW.reporter_lon IS NOT NULL THEN
    NEW.jarak_pelapor_km := haversine_km(
      NEW.reporter_lat, NEW.reporter_lon, NEW.lat, NEW.lng
    );
    IF NEW.jarak_pelapor_km > 50 THEN
      NEW.risk_flag := TRUE;
      NEW.risk_note := 'Jarak pelapor ke lokasi kejadian melebihi 50 km';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_jarak_risk ON reports;
CREATE TRIGGER trg_jarak_risk
BEFORE INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION set_jarak_dan_risk();

-- 5. RLS: require disclaimer_agreed on insert
-- Drop existing insert policy if any, then recreate
DROP POLICY IF EXISTS "user_insert_laporan" ON reports;
DROP POLICY IF EXISTS "Authenticated can insert" ON reports;

CREATE POLICY "user_insert_laporan" ON reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (disclaimer_agreed = TRUE);

-- Keep the public read policy
DROP POLICY IF EXISTS "user_read_laporan" ON reports;
DROP POLICY IF EXISTS "Anyone can read reports" ON reports;

CREATE POLICY "user_read_laporan" ON reports
  FOR SELECT TO anon, authenticated
  USING (true);

-- 6. Update the submit_report RPC to accept new parameters
-- NOTE: Adjust the existing submit_report function signature.
-- This replaces the existing function.
CREATE OR REPLACE FUNCTION submit_report(
  report_category        TEXT,
  report_description     TEXT DEFAULT NULL,
  report_rating          INT DEFAULT NULL,
  report_feedback_comment TEXT DEFAULT NULL,
  report_photo_url       TEXT DEFAULT NULL,
  report_lat             NUMERIC DEFAULT NULL,
  report_lng             NUMERIC DEFAULT NULL,
  report_gps_accuracy    NUMERIC DEFAULT NULL,
  report_address         TEXT DEFAULT NULL,
  report_kelurahan       TEXT DEFAULT NULL,
  report_kecamatan       TEXT DEFAULT NULL,
  report_kabupaten       TEXT DEFAULT NULL,
  report_provinsi        TEXT DEFAULT NULL,
  report_wilayah_id      UUID DEFAULT NULL,
  -- New dual-location params
  report_reporter_lat          NUMERIC DEFAULT NULL,
  report_reporter_lon          NUMERIC DEFAULT NULL,
  report_reporter_accuracy     NUMERIC DEFAULT NULL,
  report_reporter_gps_timestamp TIMESTAMPTZ DEFAULT NULL,
  report_disclaimer_agreed     BOOLEAN DEFAULT FALSE,
  report_disclaimer_agreed_at  TIMESTAMPTZ DEFAULT NULL
) RETURNS reports AS $$
DECLARE
  new_report reports;
BEGIN
  -- Enforce disclaimer agreement at DB level too
  IF report_disclaimer_agreed IS NOT TRUE THEN
    RAISE EXCEPTION 'DISCLAIMER_NOT_AGREED: Disclaimer harus disetujui sebelum mengirim laporan.';
  END IF;

  INSERT INTO reports (
    user_id,
    category,
    description,
    rating,
    feedback_comment,
    photo_url,
    lat,
    lng,
    gps_accuracy,
    address,
    kelurahan,
    kecamatan,
    kabupaten,
    provinsi,
    wilayah_id,
    reporter_lat,
    reporter_lon,
    reporter_accuracy,
    reporter_gps_timestamp,
    disclaimer_agreed,
    disclaimer_agreed_at,
    status,
    urgency_score,
    vote_count
  ) VALUES (
    auth.uid(),
    report_category,
    report_description,
    report_rating,
    report_feedback_comment,
    report_photo_url,
    report_lat,
    report_lng,
    report_gps_accuracy,
    report_address,
    report_kelurahan,
    report_kecamatan,
    report_kabupaten,
    report_provinsi,
    report_wilayah_id,
    report_reporter_lat,
    report_reporter_lon,
    report_reporter_accuracy,
    report_reporter_gps_timestamp,
    report_disclaimer_agreed,
    report_disclaimer_agreed_at,
    'dilaporkan',
    0,
    0
  )
  RETURNING * INTO new_report;

  RETURN new_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
