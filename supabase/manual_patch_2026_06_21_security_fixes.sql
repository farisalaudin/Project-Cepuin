-- =============================================================================
-- Cepuin security patch — 2026-06-21
--
-- Wajib dijalankan di Supabase SQL Editor jika database sudah ada
-- (patch ini idempotent — aman dijalankan berulang kali)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FIX: RLS INSERT reports — enforce disclaimer di DB level
--
-- Patch sebelumnya (manual_patch_2026_06_09) mengganti policy INSERT
-- menjadi "with check (true)" sehingga siapapun bisa insert tanpa disclaimer
-- langsung melalui Supabase client (bypass RPC). Patch ini memulihkannya.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "user_insert_laporan" ON public.reports;

CREATE POLICY "user_insert_laporan"
ON public.reports
FOR INSERT
TO anon, authenticated
WITH CHECK (disclaimer_agreed = TRUE);

-- ---------------------------------------------------------------------------
-- 2. FIX: Ganti password admin@cepuin.id yang lemah (password lama: 'admin')
--
-- Jika akun belum ada, tidak ada efeknya.
-- Jika sudah ada, password langsung diperbarui.
--
-- PENTING: Setelah ini, pastikan juga ganti password via
--   Supabase Dashboard → Authentication → Users → admin@cepuin.id → Edit
-- ---------------------------------------------------------------------------

UPDATE auth.users
SET
  encrypted_password = crypt('C3pu1n$Admin#2026!', gen_salt('bf', 10)),
  updated_at = now()
WHERE email = 'admin@cepuin.id';

DO $$
BEGIN
  IF FOUND THEN
    RAISE NOTICE 'Password admin@cepuin.id berhasil diperbarui.';
  ELSE
    RAISE NOTICE 'Akun admin@cepuin.id tidak ditemukan, tidak ada yang diubah.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Konfirmasi
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '=== SECURITY PATCH 2026-06-21 SELESAI ===';
  RAISE NOTICE '1. RLS INSERT reports: disclaimer_agreed = TRUE kembali diwajibkan';
  RAISE NOTICE '2. Password admin@cepuin.id diperbarui (jika akun ada)';
  RAISE NOTICE 'Segera ganti password via Supabase Dashboard setelah ini!';
END;
$$;
