-- Update Ron's account to Admin directly
INSERT INTO public.users (id, email, full_name, status, role)
SELECT id, email, 'Ron Toledo', 'approved', 'admin'
FROM auth.users
WHERE email = 'ront123@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', status = 'approved';
