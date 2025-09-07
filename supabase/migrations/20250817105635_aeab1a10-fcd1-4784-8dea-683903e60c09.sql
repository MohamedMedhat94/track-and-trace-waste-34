-- Reset admin user password and ensure account is properly set up
UPDATE auth.users 
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  email_confirmed_at = now(),
  confirmation_token = '',
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"email_verified": true}'::jsonb,
  updated_at = now()
WHERE email = 'abdullah1@gmail.com';

-- Also ensure the profile is properly set up
INSERT INTO public.profiles (user_id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  'System Administrator',
  'admin',
  true
FROM auth.users u 
WHERE u.email = 'abdullah1@gmail.com' 
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  is_active = true,
  full_name = 'System Administrator',
  updated_at = now();