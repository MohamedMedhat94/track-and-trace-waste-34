-- Fix admin account
UPDATE profiles 
SET role = 'admin', is_active = true 
WHERE email = 'abdullah1@gmail.com' OR email = 'Abdullah1@gmail.com';

-- Verify the update
SELECT email, role, is_active FROM profiles WHERE email = 'abdullah1@gmail.com';