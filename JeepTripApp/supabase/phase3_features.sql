-- Phase 3 Features: Participant Limits
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT null;
