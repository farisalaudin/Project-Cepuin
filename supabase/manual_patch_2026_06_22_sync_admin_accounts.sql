-- =============================================================================
-- Cepuin patch — 2026-06-22 (v2)
-- Sinkronisasi akun admin & wilayah laporan
--
-- Perubahan:
--   1. Hapus akun central@cepuin.id (dari auth.users, admin, admin_users)
--   2. Pastikan admin@cepuin.id ada di tabel admin dengan wilayah_id = NULL
--      (artinya: menerima SEMUA laporan dari semua wilayah)
--   3. Perluas keywords wilayah agar lebih akurat menangkap hasil Nominatim
--   4. Backfill wilayah_id menggunakan SEMUA kolom teks tersedia:
--      kabupaten, kecamatan, kelurahan, provinsi, DAN address (teks lengkap)
--      → lebih akurat dari patch sebelumnya
--   5. Fallback koordinat GPS untuk laporan yang teks-nya ambigus
--
-- Idempotent: aman dijalankan berulang kali.
-- Jalankan di: Supabase Dashboard → SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- DIAGNOSA: tampilkan state laporan sebelum patch
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_total INT; v_null_wil INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.reports;
  SELECT COUNT(*) INTO v_null_wil FROM public.reports WHERE wilayah_id IS NULL;
  RAISE NOTICE '--- Sebelum patch: % laporan total, % belum punya wilayah_id ---', v_total, v_null_wil;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. HAPUS akun central@cepuin.id
-- ---------------------------------------------------------------------------

DELETE FROM public.admin       WHERE email    = 'central@cepuin.id';
DELETE FROM public.admin_users WHERE user_id  = (SELECT id FROM auth.users WHERE email = 'central@cepuin.id');
DELETE FROM auth.users         WHERE email    = 'central@cepuin.id';

DO $$ BEGIN RAISE NOTICE '✓ Akun central@cepuin.id dihapus (atau tidak ada)'; END; $$;

-- ---------------------------------------------------------------------------
-- 2. PASTIKAN admin@cepuin.id terdaftar sebagai super admin (wilayah_id NULL)
-- ---------------------------------------------------------------------------

INSERT INTO public.admin (email, wilayah_id)
VALUES ('admin@cepuin.id', NULL)
ON CONFLICT (email) DO UPDATE SET wilayah_id = NULL;

INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'admin@cepuin.id'
ON CONFLICT (user_id) DO NOTHING;

DO $$ BEGIN RAISE NOTICE '✓ admin@cepuin.id dikonfirmasi sebagai super admin'; END; $$;

-- ---------------------------------------------------------------------------
-- 3. PERBARUI keywords wilayah (pola umum dari Nominatim Indonesia)
-- ---------------------------------------------------------------------------

UPDATE public.wilayah
SET keywords = ARRAY[
  'kota malang',
  'malang kota',
  'city of malang',
  'klojen',
  'lowokwaru',
  'blimbing',
  'kedungkandang',
  'sukun'
]
WHERE nama = 'Kota Malang' AND provinsi = 'Jawa Timur';

UPDATE public.wilayah
SET keywords = ARRAY[
  'kabupaten malang',
  'malang kabupaten',
  'kab. malang',
  'kab malang',
  'kabupaten. malang',
  'kepanjen',
  'singosari',
  'lawang',
  'batu'
]
WHERE nama = 'Kab. Malang' AND provinsi = 'Jawa Timur';

UPDATE public.wilayah
SET keywords = ARRAY[
  'kota bekasi',
  'bekasi kota',
  'city of bekasi',
  'bekasi',
  'mustikajaya',
  'bantargebang',
  'pondokgede',
  'jatiasih'
]
WHERE nama = 'Kota Bekasi' AND provinsi = 'Jawa Barat';

DO $$ BEGIN RAISE NOTICE '✓ Keywords wilayah diperbarui (termasuk kecamatan khas)'; END; $$;

-- ---------------------------------------------------------------------------
-- 4. BACKFILL wilayah_id — haystack LENGKAP (termasuk address & koordinat)
--
-- Strategi 3 lapis:
--   Layer A: teks eksplisit "kota malang" / "kabupaten malang" / "kota bekasi"
--   Layer B: kecamatan khas yang hanya ada di 1 wilayah
--   Layer C: fallback bounding-box koordinat GPS
--
-- Urutan PENTING:
--   - Kota Bekasi dicek PERTAMA (teks "bekasi" tidak overlap dengan Malang)
--   - Kota Malang dicek SEBELUM Kab. Malang (teks "kota" lebih spesifik)
--   - Kab. Malang dicek TERAKHIR (paling luas, jadi fallback area Malang)
-- ---------------------------------------------------------------------------

-- Helper CTE: haystack gabungan semua field teks
-- Jalankan 3x (per wilayah) karena Postgres tidak bisa re-use CTE di UPDATE berbeda

-- ── LAYER A + B: Text matching ──────────────────────────────────────────────

-- 4a. Kota Bekasi (teks dan kecamatan khas)
WITH h AS (
  SELECT id,
    LOWER(
      COALESCE(address, '')    || ' ' ||
      COALESCE(kabupaten, '')  || ' ' ||
      COALESCE(kecamatan, '')  || ' ' ||
      COALESCE(kelurahan, '')  || ' ' ||
      COALESCE(provinsi, '')
    ) AS t
  FROM public.reports WHERE wilayah_id IS NULL
)
UPDATE public.reports r
SET    wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kota Bekasi' LIMIT 1)
FROM   h
WHERE  r.id = h.id
  AND  (
    h.t LIKE '%kota bekasi%'
    OR h.t LIKE '%bekasi kota%'
    OR (h.t LIKE '%bekasi%' AND h.t LIKE '%jawa barat%')
    OR h.t LIKE '%mustikajaya%'
    OR h.t LIKE '%bantargebang%'
    OR h.t LIKE '%pondokgede%'
    OR h.t LIKE '%jatiasih%'
  );

-- 4b. Kota Malang (teks dan kecamatan khas)
WITH h AS (
  SELECT id,
    LOWER(
      COALESCE(address, '')    || ' ' ||
      COALESCE(kabupaten, '')  || ' ' ||
      COALESCE(kecamatan, '')  || ' ' ||
      COALESCE(kelurahan, '')  || ' ' ||
      COALESCE(provinsi, '')
    ) AS t
  FROM public.reports WHERE wilayah_id IS NULL
)
UPDATE public.reports r
SET    wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kota Malang' LIMIT 1)
FROM   h
WHERE  r.id = h.id
  AND  (
    h.t LIKE '%kota malang%'
    OR h.t LIKE '%malang kota%'
    OR h.t LIKE '%klojen%'
    OR h.t LIKE '%lowokwaru%'
    OR h.t LIKE '%blimbing%'
    OR (h.t LIKE '%kedungkandang%' AND h.t NOT LIKE '%kabupaten%')
    OR (h.t LIKE '%sukun%'         AND h.t NOT LIKE '%kabupaten%')
  );

-- 4c. Kab. Malang (teks dan kecamatan khas, excl. Kota Malang & Kota Batu)
WITH h AS (
  SELECT id,
    LOWER(
      COALESCE(address, '')    || ' ' ||
      COALESCE(kabupaten, '')  || ' ' ||
      COALESCE(kecamatan, '')  || ' ' ||
      COALESCE(kelurahan, '')  || ' ' ||
      COALESCE(provinsi, '')
    ) AS t
  FROM public.reports WHERE wilayah_id IS NULL
)
UPDATE public.reports r
SET    wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kab. Malang' LIMIT 1)
FROM   h
WHERE  r.id = h.id
  AND  (
    h.t LIKE '%kabupaten malang%'
    OR h.t LIKE '%kab. malang%'
    OR h.t LIKE '%kab malang%'
    OR h.t LIKE '%kepanjen%'
    OR h.t LIKE '%singosari%'
    OR h.t LIKE '%lawang%'
    OR h.t LIKE '%karangploso%'
    OR h.t LIKE '%pakis%'
    OR h.t LIKE '%tumpang%'
    OR h.t LIKE '%gondanglegi%'
    OR h.t LIKE '%dampit%'
    OR h.t LIKE '%sumberpucung%'
    OR h.t LIKE '%pagak%'
    OR h.t LIKE '%dau%'
    OR h.t LIKE '%wagir%'
    OR h.t LIKE '%pakisaji%'
    OR h.t LIKE '%tajinan%'
    OR h.t LIKE '%turen%'
    OR h.t LIKE '%wajak%'
    OR h.t LIKE '%ampelgading%'
    OR h.t LIKE '%poncokusumo%'
  );

DO $$ BEGIN RAISE NOTICE '✓ Layer A+B (text matching) selesai'; END; $$;

-- ── LAYER C: Fallback bounding-box koordinat ────────────────────────────────
-- Untuk laporan yang teks-nya tidak mengandung kata kunci manapun
-- (misal laporan lama tanpa geocode fields, atau Nominatim mengembalikan data minimal)

-- Kota Bekasi bounding box: -6.34 s/d -6.16 lat, 106.87 s/d 107.05 lng
WITH remaining AS (
  SELECT id FROM public.reports
  WHERE wilayah_id IS NULL
    AND lat BETWEEN -6.34 AND -6.16
    AND lng BETWEEN 106.87 AND 107.05
)
UPDATE public.reports r
SET    wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kota Bekasi' LIMIT 1)
FROM   remaining
WHERE  r.id = remaining.id;

-- Kota Malang bounding box: -8.05 s/d -7.92 lat, 112.57 s/d 112.73 lng
WITH remaining AS (
  SELECT id FROM public.reports
  WHERE wilayah_id IS NULL
    AND lat BETWEEN -8.05 AND -7.92
    AND lng BETWEEN 112.57 AND 112.73
)
UPDATE public.reports r
SET    wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kota Malang' LIMIT 1)
FROM   remaining
WHERE  r.id = remaining.id;

-- Kab. Malang bounding box (area lebih luas, excl. Kota Malang di tengahnya):
-- lat -8.5 s/d -7.75, lng 112.3 s/d 123.15 (dan bukan area Kota Malang)
WITH remaining AS (
  SELECT id FROM public.reports
  WHERE wilayah_id IS NULL
    AND lat  BETWEEN -8.5  AND -7.75
    AND lng  BETWEEN 112.3 AND 123.15
    AND NOT (lat BETWEEN -8.05 AND -7.92 AND lng BETWEEN 112.57 AND 112.73)
)
UPDATE public.reports r
SET    wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kab. Malang' LIMIT 1)
FROM   remaining
WHERE  r.id = remaining.id;

DO $$ BEGIN RAISE NOTICE '✓ Layer C (bounding-box GPS) selesai'; END; $$;

-- ---------------------------------------------------------------------------
-- 5. VERIFIKASI AKHIR
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_total       INT;
  v_null_wil    INT;
  v_no_central  BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM public.reports;
  SELECT COUNT(*) INTO v_null_wil FROM public.reports WHERE wilayah_id IS NULL;
  SELECT NOT EXISTS(SELECT 1 FROM auth.users WHERE email = 'central@cepuin.id') INTO v_no_central;

  RAISE NOTICE '=== PATCH 2026-06-22 v2 SELESAI ===';
  RAISE NOTICE 'Total laporan      : %', v_total;
  RAISE NOTICE 'Belum punya wilayah: % (laporan dari luar 3 kota/kab = masuk super admin)', v_null_wil;
  RAISE NOTICE 'central dihapus    : %', v_no_central;
END;
$$;

-- Tabel: distribusi laporan per wilayah
SELECT
  COALESCE(w.nama, '(belum ter-assign — masuk super admin)') AS wilayah,
  COUNT(*) AS jumlah_laporan
FROM public.reports r
LEFT JOIN public.wilayah w ON w.id = r.wilayah_id
GROUP BY w.nama
ORDER BY jumlah_laporan DESC;

-- Tabel: akun admin dan aksesnya
SELECT
  a.email,
  COALESCE(w.nama, 'SEMUA WILAYAH') AS akses_wilayah,
  w.tipe,
  w.provinsi
FROM public.admin a
LEFT JOIN public.wilayah w ON w.id = a.wilayah_id
ORDER BY a.email;
