-- =============================================================================
-- Fix: admin@cepuin.id tidak bisa login
-- Jalankan di: Supabase Dashboard → SQL Editor
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_admin_id UUID;
  -- GANTI dengan password yang diinginkan sebelum menjalankan script ini
  v_new_password TEXT := '<GANTI_PASSWORD_ADMIN>';
BEGIN
  -- Cek apakah akun sudah ada
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'admin@cepuin.id';

  IF v_admin_id IS NULL THEN
    -- Buat akun baru
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'admin@cepuin.id',
      crypt(v_new_password, gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false, false, now(), now()
    ) RETURNING id INTO v_admin_id;

    RAISE NOTICE '✓ Akun admin@cepuin.id DIBUAT BARU (ID: %)', v_admin_id;
  ELSE
    -- Reset password
    UPDATE auth.users
    SET
      encrypted_password = crypt(v_new_password, gen_salt('bf', 10)),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_admin_id;

    RAISE NOTICE '✓ Password admin@cepuin.id DIRESET (ID: %)', v_admin_id;
  END IF;

  -- Pastikan terdaftar di admin_users
  INSERT INTO public.admin_users (user_id)
  VALUES (v_admin_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Pastikan terdaftar di tabel admin dengan wilayah_id NULL (semua wilayah)
  INSERT INTO public.admin (email, wilayah_id)
  VALUES ('admin@cepuin.id', NULL)
  ON CONFLICT (email) DO UPDATE SET wilayah_id = NULL;

  RAISE NOTICE '';
  RAISE NOTICE '=== SELESAI ===';
  RAISE NOTICE 'Email    : admin@cepuin.id';
  RAISE NOTICE 'Password : (password yang kamu set di v_new_password)';
  RAISE NOTICE 'Akses    : SUPER ADMIN (semua wilayah)';
END;
$$;
