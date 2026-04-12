-- Phase 11: Cleanup - Wipe old standalone groups

-- 1. Remove all trip-group associations
DELETE FROM public.trip_groups;

-- 2. Remove all group memberships
DELETE FROM public.group_members;

-- 3. Delete all groups 
-- (New groups will be created automatically when new trips are launched)
DELETE FROM public.groups;

NOTIFY pgrst, 'reload schema';
