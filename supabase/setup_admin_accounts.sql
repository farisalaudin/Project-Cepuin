-- ============================================================
-- Cepuin — Setup Admin Accounts
-- Jalankan via: supabase db query --linked -f setup_admin_accounts.sql
--
-- Yang dikerjakan:
--   1. Buat 4 auth users (skip jika sudah ada)
--   2. Daftarkan ke admin_users (akses UI /admin)
--   3. Daftarkan ke admin table dengan wilayah scoping:
--      - kotamalang@cepuin.id  → Kota Malang saja
--      - kabmalang@cepuin.id   → Kab. Malang saja
--      - kotabekasi@cepuin.id  → Kota Bekasi saja
--      - central@cepuin.id     → SEMUA wilayah (wilayah_id NULL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_central_id    UUID;
  v_kotamalang_id UUID;
  v_kabmalang_id  UUID;
  v_bekasi_id     UUID;

  -- UUID wilayah (hardcoded dari query aktual)
  v_wil_kotamalang UUID := 'd02feea2-2683-4992-97c3-db6ebfaa67e3';
  v_wil_kabmalang  UUID := 'c4adb324-c7e6-40a5-b7fa-3910fac0c705';
  v_wil_bekasi     UUID := 'a8d90058-abd7-46cd-9437-e784b6a90cec';
BEGIN

  -- ----------------------------------------------------------
  -- 1. Buat auth users — skip jika email sudah ada
  -- ----------------------------------------------------------

  -- Admin Kota Malang
  SELECT id INTO v_kotamalang_id FROM auth.users WHERE email = 'kotamalang@cepuin.id';
  IF v_kotamalang_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'kotamalang@cepuin.id',
      crypt('CepuinKotaMalang2026!', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      false, false, now(), now()
    ) RETURNING id INTO v_kotamalang_id;
    RAISE NOTICE 'Akun dibuat: kotamalang@cepuin.id (ID: %)', v_kotamalang_id;
  ELSE
    RAISE NOTICE 'Akun sudah ada: kotamalang@cepuin.id (ID: %)', v_kotamalang_id;
  END IF;

  -- Admin Kab. Malang
  SELECT id INTO v_kabmalang_id FROM auth.users WHERE email = 'kabmalang@cepuin.id';
  IF v_kabmalang_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'kabmalang@cepuin.id',
      crypt('CepuinKabMalang2026!', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      false, false, now(), now()
    ) RETURNING id INTO v_kabmalang_id;
    RAISE NOTICE 'Akun dibuat: kabmalang@cepuin.id (ID: %)', v_kabmalang_id;
  ELSE
    RAISE NOTICE 'Akun sudah ada: kabmalang@cepuin.id (ID: %)', v_kabmalang_id;
  END IF;

  -- Admin Kota Bekasi
  SELECT id INTO v_bekasi_id FROM auth.users WHERE email = 'kotabekasi@cepuin.id';
  IF v_bekasi_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'kotabekasi@cepuin.id',
      crypt('CepuinKotaBekasi2026!', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      false, false, now(), now()
    ) RETURNING id INTO v_bekasi_id;
    RAISE NOTICE 'Akun dibuat: kotabekasi@cepuin.id (ID: %)', v_bekasi_id;
  ELSE
    RAISE NOTICE 'Akun sudah ada: kotabekasi@cepuin.id (ID: %)', v_bekasi_id;
  END IF;

  -- Admin Central (menerima SEMUA laporan)
  SELECT id INTO v_central_id FROM auth.users WHERE email = 'central@cepuin.id';
  IF v_central_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'central@cepuin.id',
      crypt('CepuinCentral2026!Admin', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      false, false, now(), now()
    ) RETURNING id INTO v_central_id;
    RAISE NOTICE 'Akun dibuat: central@cepuin.id (ID: %)', v_central_id;
  ELSE
    RAISE NOTICE 'Akun sudah ada: central@cepuin.id (ID: %)', v_central_id;
  END IF;

  -- ----------------------------------------------------------
  -- 2. Daftarkan ke admin_users (diperlukan untuk akses UI /admin)
  -- ----------------------------------------------------------
  INSERT INTO public.admin_users (user_id)
  VALUES (v_kotamalang_id), (v_kabmalang_id), (v_bekasi_id), (v_central_id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'admin_users: 4 akun terdaftar (skip jika sudah ada)';

  -- ----------------------------------------------------------
  -- 3. Pastikan admin table berisi email → wilayah mapping
  --    Central admin: wilayah_id NULL = lihat semua laporan
  -- ----------------------------------------------------------
  INSERT INTO public.admin (email, wilayah_id) VALUES
    ('kotamalang@cepuin.id', v_wil_kotamalang),
    ('kabmalang@cepuin.id',  v_wil_kabmalang),
    ('kotabekasi@cepuin.id', v_wil_bekasi),
    ('central@cepuin.id',    NULL)
  ON CONFLICT (email) DO UPDATE
    SET wilayah_id = EXCLUDED.wilayah_id;

  RAISE NOTICE '=== SETUP SELESAI ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Email                   Password                    Akses';
  RAISE NOTICE 'central@cepuin.id       CepuinCentral2026!Admin     Semua wilayah';
  RAISE NOTICE 'kotamalang@cepuin.id    CepuinKotaMalang2026!       Kota Malang';
  RAISE NOTICE 'kabmalang@cepuin.id     CepuinKabMalang2026!        Kab. Malang';
  RAISE NOTICE 'kotabekasi@cepuin.id    CepuinKotaBekasi2026!       Kota Bekasi';

END $$;
