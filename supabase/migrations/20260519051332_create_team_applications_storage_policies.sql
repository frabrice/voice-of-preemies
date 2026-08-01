/*
  # Create storage bucket and policies for team application photos

  Creates the 'team-applications' storage bucket for profile picture uploads
  and configures RLS policies to allow public uploads and reads.
*/

-- Create the bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-applications',
  'team-applications',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Anyone can upload team application photos'
  ) THEN
    CREATE POLICY "Anyone can upload team application photos"
      ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'team-applications');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public can read team application photos'
  ) THEN
    CREATE POLICY "Public can read team application photos"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'team-applications');
  END IF;
END $$;
