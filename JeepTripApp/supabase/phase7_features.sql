-- Phase 7: Maps, Logistics Categorization & Private Chat

-- 1. Logistics Enhancements
ALTER TABLE public.logistics_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('rescue', 'food', 'general'));

-- 2. Navigation Enhancements (Navigate to Start)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS start_lat DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS start_lng DOUBLE PRECISION;

-- 3. Private Messaging
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received" ON public.private_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send private messages" ON public.private_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
