-- Enforce Osaka University email addresses for Supabase Auth users.
-- Apply this to staging/production after confirming existing public.users rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_email_osaka_domain'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_email_osaka_domain
      CHECK (lower(email) LIKE '%@osaka-u.ac.jp') NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF new.email IS NULL OR lower(new.email) NOT LIKE '%@osaka-u.ac.jp' THEN
    RAISE EXCEPTION '大阪大学のメールアドレスで登録してください'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.users (id, email, nickname)
  VALUES (
    new.id,
    new.email,
    COALESCE(NULLIF(BTRIM(new.raw_user_meta_data->>'nickname'), ''), 'ゲストユーザー')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
      AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'auth.users does not exist; skipping Supabase Auth user trigger setup';
    RETURN;
  END IF;

  INSERT INTO public.users (id, email, nickname)
  SELECT
    auth_users.id,
    auth_users.email,
    COALESCE(NULLIF(BTRIM(auth_users.raw_user_meta_data->>'nickname'), ''), 'ゲストユーザー')
  FROM auth.users AS auth_users
  WHERE auth_users.email IS NOT NULL
    AND lower(auth_users.email) LIKE '%@osaka-u.ac.jp'
  ON CONFLICT (id) DO NOTHING;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
END;
$$;
