-- Phase 10: Trip Admins & Logistics Templates

-- 1. Add roles to trip_attendees (to support 'manager' vs 'attendee')
ALTER TABLE public.trip_attendees 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'attendee';

-- 2. Create logistics_templates table
CREATE TABLE IF NOT EXISTS public.logistics_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for templates
ALTER TABLE public.logistics_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own templates" 
ON public.logistics_templates FOR ALL 
USING (auth.uid() = user_id);

-- 3. Create logistics_template_items table
CREATE TABLE IF NOT EXISTS public.logistics_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES public.logistics_templates(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL
);

-- Enable RLS for template items
ALTER TABLE public.logistics_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own template items via template ownership"
ON public.logistics_template_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.logistics_templates t 
    WHERE t.id = template_id AND t.user_id = auth.uid()
  )
);

-- Force cache reload to make new tables and columns immediately available in JS APIs
NOTIFY pgrst, 'reload schema';
