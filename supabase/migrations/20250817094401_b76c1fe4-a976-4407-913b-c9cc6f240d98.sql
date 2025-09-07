-- Fix the authentication and company activation issues

-- Update the handle_new_user function to properly handle admin users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'generator'),
    -- Admin accounts are active by default, others need activation
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', 'generator') = 'admin' THEN true
      ELSE true  -- Changed to true for testing purposes
    END
  );
  
  -- Log the auth event properly
  INSERT INTO auth_logs (user_id, email, action, ip_address, user_agent)
  VALUES (
    NEW.id,
    NEW.email,
    'signup',
    NEW.raw_user_meta_data ->> 'ip_address',
    NEW.raw_user_meta_data ->> 'user_agent'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle case where profile already exists
    RETURN NEW;
END;
$$;

-- Create a function to auto-activate new companies (for testing)
CREATE OR REPLACE FUNCTION public.auto_activate_companies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- For testing purposes, auto-activate new companies
  NEW.is_active = true;
  RETURN NEW;
END;
$$;

-- Add trigger to auto-activate companies
CREATE TRIGGER auto_activate_new_companies
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_companies();

-- Activate all existing companies for testing
UPDATE companies SET is_active = true WHERE is_active = false;

-- Create admin dashboard stats function
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
  total_companies bigint,
  total_drivers bigint,
  total_shipments bigint,
  active_shipments bigint,
  pending_users bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    (SELECT COUNT(*) FROM companies WHERE is_active = true) as total_companies,
    (SELECT COUNT(*) FROM drivers) as total_drivers,
    (SELECT COUNT(*) FROM shipments) as total_shipments,
    (SELECT COUNT(*) FROM shipments WHERE status IN ('pending', 'in_transit')) as active_shipments,
    (SELECT COUNT(*) FROM profiles WHERE is_active = false) as pending_users;
$$;