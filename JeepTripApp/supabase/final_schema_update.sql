-- 1. Add all new columns safely
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS start_lat DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS start_lng DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS off_road_url TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS meeting_time TEXT;

-- 2. Force Supabase to refresh its Schema Cache so the API recognizes the new columns immediately
NOTIFY pgrst, 'reload schema';
