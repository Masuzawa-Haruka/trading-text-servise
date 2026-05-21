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
    COALESCE(new.raw_user_meta_data->>'nickname', 'ゲストユーザー')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
