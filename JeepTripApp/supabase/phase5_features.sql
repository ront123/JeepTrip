-- Phase 5: Multi-Group Trips support
CREATE TABLE IF NOT EXISTS public.trip_groups (
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, group_id)
);

-- Enable RLS
ALTER TABLE public.trip_groups ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and insert (for now, for development speed)
CREATE POLICY "Allow authenticated for all trip_groups" ON public.trip_groups 
  FOR ALL USING (auth.role() = 'authenticated');
