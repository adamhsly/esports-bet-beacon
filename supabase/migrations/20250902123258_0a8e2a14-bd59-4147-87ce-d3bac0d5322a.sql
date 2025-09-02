
-- 1) Ensure the "shares" bucket exists and is public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'shares'
  ) THEN
    PERFORM storage.create_bucket('shares', public := true);
  END IF;
END $$;

-- If the bucket exists but isn't public, make it public
UPDATE storage.buckets
SET public = true
WHERE id = 'shares' AND public IS DISTINCT FROM true;

-- 2) Policies on storage.objects for the "shares" bucket

-- Public read access for "shares"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read for shares'
  ) THEN
    CREATE POLICY "Public read for shares"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'shares');
  END IF;
END $$;

-- Authenticated users can upload (INSERT) to "shares"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated uploads to shares'
  ) THEN
    CREATE POLICY "Authenticated uploads to shares"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'shares' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Authenticated users can update objects in "shares" (needed for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated updates to shares'
  ) THEN
    CREATE POLICY "Authenticated updates to shares"
      ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'shares' AND auth.role() = 'authenticated')
      WITH CHECK (bucket_id = 'shares' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Authenticated users can delete objects in "shares" (optional but useful)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated deletes from shares'
  ) THEN
    CREATE POLICY "Authenticated deletes from shares"
      ON storage.objects
      FOR DELETE
      USING (bucket_id = 'shares' AND auth.role() = 'authenticated');
  END IF;
END $$;
