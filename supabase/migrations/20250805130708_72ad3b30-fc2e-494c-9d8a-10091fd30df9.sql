-- Fix auth.uid() infinite recursion issue
-- Create security-definer function to get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Update all policies that were causing recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Update other policies that might cause recursion
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
CREATE POLICY "Admins can manage companies" 
ON public.companies 
FOR ALL
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can manage drivers" ON public.drivers;
CREATE POLICY "Admins can manage drivers" 
ON public.drivers 
FOR ALL
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" 
ON public.notifications 
FOR ALL
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can manage counters" ON public.system_counters;
CREATE POLICY "Admins can manage counters" 
ON public.system_counters 
FOR ALL
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all logs" ON public.system_logs;
CREATE POLICY "Admins can view all logs" 
ON public.system_logs 
FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- Add department field to drivers table for departmental filtering
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS department text;

-- Add location tracking fields to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS current_latitude numeric,
ADD COLUMN IF NOT EXISTS current_longitude numeric,
ADD COLUMN IF NOT EXISTS last_location_update timestamp with time zone DEFAULT now();

-- Add location tracking to shipments table  
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS pickup_latitude numeric,
ADD COLUMN IF NOT EXISTS pickup_longitude numeric,
ADD COLUMN IF NOT EXISTS delivery_latitude numeric,
ADD COLUMN IF NOT EXISTS delivery_longitude numeric;

-- Create auth_logs table for tracking authentication activity
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text,
  action text NOT NULL, -- 'login', 'logout', 'signup'
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on auth_logs
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for auth_logs
CREATE POLICY "Admins can view all auth logs" 
ON public.auth_logs 
FOR ALL
USING (public.get_current_user_role() = 'admin');

-- Create function to log auth events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  user_id_param uuid,
  email_param text,
  action_param text,
  ip_param text DEFAULT NULL,
  user_agent_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.auth_logs (user_id, email, action, ip_address, user_agent)
  VALUES (user_id_param, email_param, action_param, ip_param, user_agent_param)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;