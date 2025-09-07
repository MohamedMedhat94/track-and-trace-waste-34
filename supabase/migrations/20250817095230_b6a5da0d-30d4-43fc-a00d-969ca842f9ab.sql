-- Create a fresh admin account
-- First, let's see if we can reset the password for the existing user

-- For now, let's create a simple signup function that will create the admin
-- when they sign up through the UI

-- Update the handle_new_user function to immediately activate admin users
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
    CASE 
      WHEN NEW.email = 'abdullah1@gmail.com' OR NEW.email = 'Abdullah1@gmail.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data ->> 'role', 'generator')
    END,
    CASE 
      WHEN NEW.email = 'abdullah1@gmail.com' OR NEW.email = 'Abdullah1@gmail.com' THEN true
      ELSE true  -- All users active for testing
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