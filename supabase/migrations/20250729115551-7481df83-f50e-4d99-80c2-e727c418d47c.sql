-- Update the existing user to admin role for initial admin access
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'ahmmedelkady691@gmail.com';

-- Create a secure function to promote users to admin (only usable by existing admins)
CREATE OR REPLACE FUNCTION promote_user_to_admin(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can promote users';
  END IF;
  
  UPDATE profiles 
  SET role = 'admin' 
  WHERE email = target_email;
END;
$$;