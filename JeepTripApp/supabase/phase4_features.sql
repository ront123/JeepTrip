-- Phase 4: Add invite token to groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS invite_token TEXT DEFAULT md5(random()::text);
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_invite_token ON public.groups(invite_token);
