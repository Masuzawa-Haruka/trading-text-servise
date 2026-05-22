-- Create Supabase Storage bucket and policies for report evidence images.
-- Plain PostgreSQL test databases do not have the storage schema, so this
-- migration intentionally skips itself outside Supabase.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage'
  ) THEN
    RAISE NOTICE 'storage schema does not exist; skipping report-evidence bucket setup';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'report-evidence',
    'report-evidence',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS "Users can view own report evidence images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload own report evidence images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own report evidence images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own report evidence images" ON storage.objects;

  CREATE POLICY "Users can view own report evidence images"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'report-evidence'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Users can upload own report evidence images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'report-evidence'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Users can update own report evidence images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'report-evidence'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'report-evidence'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Users can delete own report evidence images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'report-evidence'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
END;
$$;
