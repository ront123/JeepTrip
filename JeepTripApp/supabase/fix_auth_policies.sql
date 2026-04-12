-- 1. Create a function that automatically copies new user data from Supabase Auth to our public.users table
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, vehicle_details, status, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'vehicle_details',
    'pending',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Setup basic RLS Policies so the application can actually read data when you log in.
-- If RLS is enabled without these, all fetching returns exactly 0 rows, causing the login to fail.

CREATE POLICY "Enable read access for authenticated users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated" ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated" ON public.trip_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated" ON public.logistics_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated" ON public.trip_messages FOR SELECT TO authenticated USING (true);
