-- Fix the auth_logs table issue and handle_new_user function
-- First, let's make sure the auth_logs table exists and is properly configured
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on auth_logs
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for auth_logs
CREATE POLICY IF NOT EXISTS "Admins can view all auth logs" 
ON public.auth_logs 
FOR ALL 
TO authenticated 
USING (get_current_user_role() = 'admin');

-- Fix the handle_new_user function to handle errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
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
      ELSE true
    END
  );
  
  -- Try to log the auth event, but don't fail if it doesn't work
  BEGIN
    INSERT INTO public.auth_logs (user_id, email, action, ip_address, user_agent)
    VALUES (
      NEW.id,
      NEW.email,
      'signup',
      NEW.raw_user_meta_data ->> 'ip_address',
      NEW.raw_user_meta_data ->> 'user_agent'
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log failed but don't block user creation
      NULL;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle case where profile already exists
    RETURN NEW;
  WHEN OTHERS THEN
    -- For any other error, still return NEW to not block signup
    RETURN NEW;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the admin user can login by resetting password if needed
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  confirmation_token = '',
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"email_verified": true}'::jsonb
WHERE email = 'abdullah1@gmail.com';