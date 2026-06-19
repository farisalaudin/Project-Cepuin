-- ============================================================
-- Backfill wilayah_id untuk laporan yang belum ter-assign
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Laporan Sampah Menumpuk di Kota Malang (lat=-7.93, lng=112.66)
--    Hasil reverse geocode: city = "Kota Malang"
UPDATE reports
SET wilayah_id = (SELECT id FROM wilayah WHERE nama = 'Kota Malang' LIMIT 1)
WHERE id = '62c4ab70-11bc-4ed1-85f2-439248ce4c88'
  AND wilayah_id IS NULL;

-- 2. Laporan Sampah Menumpuk di Kota Bekasi (lat=-6.24, lng=106.99)
--    Hasil reverse geocode: city = "Bekasi" → Kota Bekasi
UPDATE reports
SET wilayah_id = (SELECT id FROM wilayah WHERE nama = 'Kota Bekasi' LIMIT 1)
WHERE id = '9c5ad40d-be45-49fa-a12d-0b74c0a39cfc'
  AND wilayah_id IS NULL;

-- Verifikasi hasil
SELECT id, category, wilayah_id, lat, lng
FROM reports
ORDER BY created_at DESC;
