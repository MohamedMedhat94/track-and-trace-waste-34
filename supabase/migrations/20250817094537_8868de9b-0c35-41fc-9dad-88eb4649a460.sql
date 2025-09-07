-- Create admin user 
-- First insert into auth.users (this would normally be done through Supabase Auth)
-- For testing purposes, we'll create a profile for the admin user that will be created

-- Insert admin profile for user who signs up with abdullah1@gmail.com
-- This will be linked when the actual user signs up through Supabase Auth

-- Create a function to ensure first admin signup gets admin role
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If this is the first user with abdullah1@gmail.com, make them admin
  IF NEW.email = 'abdullah1@gmail.com' OR NEW.email = 'Abdullah1@gmail.com' THEN
    NEW.role = 'admin';
    NEW.is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to ensure admin gets correct role
CREATE TRIGGER ensure_admin_role
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_admin_role();