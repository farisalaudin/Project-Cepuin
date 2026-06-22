-- =============================================================================
-- Cepuin — Force assign wilayah_id (v2, urutan diperbaiki)
-- Jalankan di: Supabase Dashboard → SQL Editor
--
-- Strategi 2 pass:
--   PASS 1 — TEXT (prioritas tertinggi, menimpa GPS jika ada konflik)
--   PASS 2 — GPS bounding-box (hanya untuk laporan yang MASIH NULL setelah pass 1)
--
-- Urutan kritis:
--   Kab. Malang text SEBELUM Kota Malang GPS → laporan "Kabupaten Malang"
--   tidak akan salah masuk Kota Malang via GPS fallback.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RESET semua wilayah_id ke NULL (mulai bersih)
-- ---------------------------------------------------------------------------
UPDATE public.reports SET wilayah_id = NULL;
DO $$ BEGIN RAISE NOTICE '--- Reset selesai, memulai assignment ---'; END; $$;

-- ===========================================================================
-- PASS 1 — TEXT MATCHING (semua wilayah, berurutan)
-- Haystack = address (lengkap) + kabupaten + kecamatan + kelurahan + provinsi
-- ===========================================================================

-- ── 1A. Kota Bekasi ─────────────────────────────────────────────────────────
UPDATE public.reports
SET wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kota Bekasi' LIMIT 1)
WHERE wilayah_id IS NULL
  AND LOWER(
        COALESCE(address,'')   || ' ' || COALESCE(kabupaten,'') || ' ' ||
        COALESCE(kecamatan,'') || ' ' || COALESCE(kelurahan,'') || ' ' ||
        COALESCE(provinsi,'')
      ) LIKE '%bekasi%';

DO $$ BEGIN RAISE NOTICE '✓ 1A Kota Bekasi (text)'; END; $$;

-- ── 1B. Kabupaten Malang (SEBELUM Kota Malang agar tidak tergeser GPS) ──────
UPDATE public.reports
SET wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kab. Malang' LIMIT 1)
WHERE wilayah_id IS NULL
  AND LOWER(
        COALESCE(address,'')   || ' ' || COALESCE(kabupaten,'') || ' ' ||
        COALESCE(kecamatan,'') || ' ' || COALESCE(kelurahan,'') || ' ' ||
        COALESCE(provinsi,'')
      ) SIMILAR TO '%(kabupaten malang|kab\.? malang|kepanjen|singosari|lawang|'
                  || 'karangploso|pakis|tumpang|wagir|pakisaji|dau|gondanglegi|'
                  || 'dampit|turen|wajak|poncokusumo|jabung|ampelgading|'
                  || 'sumbermanjing|pagak|bantur|gedangan|donomulyo|kalipare|'
                  || 'ngajum|wonosari|kromengan|sumberpucung|ngantang|kasembon|'
                  || 'pujon|bululawang|tajinan|tirtoyudo|mulyoagung|desa landungsari)%';

DO $$ BEGIN RAISE NOTICE '✓ 1B Kab. Malang (text)'; END; $$;

-- ── 1C. Kota Malang ─────────────────────────────────────────────────────────
UPDATE public.reports
SET wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kota Malang' LIMIT 1)
WHERE wilayah_id IS NULL
  AND LOWER(
        COALESCE(address,'')   || ' ' || COALESCE(kabupaten,'') || ' ' ||
        COALESCE(kecamatan,'') || ' ' || COALESCE(kelurahan,'') || ' ' ||
        COALESCE(provinsi,'')
      ) SIMILAR TO '%(kota malang|malang kota|klojen|lowokwaru|oro-oro dowo|'
                  || 'blimbing|sukun|kedungkandang|arjosari|dinoyo|sumbersari|'
                  || 'kasin|gadang|sawojajar|bunulrejo|purwantoro|tlogomas)%';

DO $$ BEGIN RAISE NOTICE '✓ 1C Kota Malang (text)'; END; $$;

-- ===========================================================================
-- PASS 2 — GPS BOUNDING-BOX (hanya laporan yang MASIH NULL setelah Pass 1)
-- ===========================================================================

-- ── 2A. Kota Bekasi GPS ─────────────────────────────────────────────────────
UPDATE public.reports
SET wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kota Bekasi' LIMIT 1)
WHERE wilayah_id IS NULL
  AND lat BETWEEN -6.40 AND -6.10
  AND lng BETWEEN 106.85 AND 107.10;

DO $$ BEGIN RAISE NOTICE '✓ 2A Kota Bekasi (GPS)'; END; $$;

-- ── 2B. Kota Malang GPS (box ketat agar tidak overlap Kab. Malang) ──────────
-- Area inti Kota Malang: Klojen, Lowokwaru-dalam, Blimbing, Sukun, Kedungkandang
UPDATE public.reports
SET wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kota Malang' LIMIT 1)
WHERE wilayah_id IS NULL
  AND lat BETWEEN -8.02 AND -7.93
  AND lng BETWEEN 112.59 AND 112.70;

DO $$ BEGIN RAISE NOTICE '✓ 2B Kota Malang (GPS)'; END; $$;

-- ── 2C. Kab. Malang GPS (area luas Jawa Timur, excl. kotak Kota Malang) ─────
UPDATE public.reports
SET wilayah_id = (SELECT id FROM public.wilayah WHERE nama = 'Kab. Malang' LIMIT 1)
WHERE wilayah_id IS NULL
  AND lat  BETWEEN -8.70 AND -7.70
  AND lng  BETWEEN 112.10 AND 123.50
  AND NOT (lat BETWEEN -8.02 AND -7.93 AND lng BETWEEN 112.59 AND 112.70)
  AND NOT (lat BETWEEN -6.40 AND -6.10 AND lng BETWEEN 106.85 AND 107.10);

DO $$ BEGIN RAISE NOTICE '✓ 2C Kab. Malang (GPS)'; END; $$;

-- ===========================================================================
-- VERIFIKASI
-- ===========================================================================
DO $$
DECLARE v_total INT; v_null INT; v_assigned INT;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM public.reports;
  SELECT COUNT(*) FILTER (WHERE wilayah_id IS NULL)     INTO v_null     FROM public.reports;
  SELECT COUNT(*) FILTER (WHERE wilayah_id IS NOT NULL) INTO v_assigned FROM public.reports;
  RAISE NOTICE '=== Selesai: % total, % ter-assign, % belum ===', v_total, v_assigned, v_null;
END;
$$;

-- Tabel ringkasan per wilayah
SELECT
  COALESCE(w.nama, '(belum ter-assign)') AS wilayah,
  COUNT(*) AS jumlah
FROM public.reports r
LEFT JOIN public.wilayah w ON w.id = r.wilayah_id
GROUP BY w.nama ORDER BY jumlah DESC;

-- Tabel detail semua laporan
SELECT
  LEFT(r.address, 52)                       AS alamat,
  r.lat,
  r.lng,
  COALESCE(w.nama, 'BELUM TER-ASSIGN')      AS wilayah
FROM public.reports r
LEFT JOIN public.wilayah w ON w.id = r.wilayah_id
ORDER BY w.nama NULLS LAST, r.created_at DESC;
