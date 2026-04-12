-- 1. Hidden Trips Feature: Add the is_hidden column to the trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 2. Grant FULL access (Create, Read, Update, Delete) to all authenticated crew members
-- This ensures that any approved user can create groups, trips, check off logistics, and chat without being blocked by security policies during this development phase.

DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.groups;
CREATE POLICY "Enable ALL access for authenticated" ON public.groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.group_members;
CREATE POLICY "Enable ALL access for authenticated" ON public.group_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.trips;
CREATE POLICY "Enable ALL access for authenticated" ON public.trips FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.trip_attendees;
CREATE POLICY "Enable ALL access for authenticated" ON public.trip_attendees FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.logistics_items;
CREATE POLICY "Enable ALL access for authenticated" ON public.logistics_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated" ON public.trip_messages;
CREATE POLICY "Enable ALL access for authenticated" ON public.trip_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
