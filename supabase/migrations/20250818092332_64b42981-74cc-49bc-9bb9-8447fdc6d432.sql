-- Delete existing admin user and create fresh one
DELETE FROM auth.users WHERE email = 'abdullah1@gmail.com';

-- Create fresh admin user with known password
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'abdullah1@gmail.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- Create the profile for the admin user
INSERT INTO public.profiles (user_id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  'System Administrator',
  'admin',
  true
FROM auth.users u 
WHERE u.email = 'abdullah1@gmail.com';