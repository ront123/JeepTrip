-- Phase 11: Archive & Media columns

-- 1. Archive flag on trips
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Media support in trip_messages
ALTER TABLE public.trip_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.trip_messages ADD COLUMN IF NOT EXISTS media_type TEXT; -- 'image' | 'video'

-- 3. Allow Supabase Storage public reads on trip-media bucket
-- (This just sets up the DB policy for the trip_messages table, bucket is created in Dashboard)

-- 4. Update the storage bucket policy (run in SQL editor after creating bucket)
-- These allow authenticated users to upload and everyone to read
INSERT INTO storage.buckets (id, name, public) VALUES ('trip-media', 'trip-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'trip-media' AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'trip-media');

NOTIFY pgrst, 'reload schema';
