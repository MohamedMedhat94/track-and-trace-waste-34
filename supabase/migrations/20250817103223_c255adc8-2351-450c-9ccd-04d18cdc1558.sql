-- Fix admin user email confirmation
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  confirmation_token = '',
  raw_user_meta_data = raw_user_meta_data || '{"email_verified": true}'::jsonb
WHERE email = 'abdullah1@gmail.com';

-- Also ensure the profile is properly set up
INSERT INTO public.profiles (
  user_id, 
  email, 
  full_name, 
  role, 
  is_active, 
  created_at, 
  updated_at
) 
SELECT 
  id, 
  'abdullah1@gmail.com', 
  'System Administrator', 
  'admin', 
  true, 
  now(), 
  now()
FROM auth.users 
WHERE email = 'abdullah1@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = now();