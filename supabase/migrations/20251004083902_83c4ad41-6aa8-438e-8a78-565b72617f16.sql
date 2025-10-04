-- Step 1: Drop the old function with CASCADE (this will drop all dependent policies)
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;

-- Step 2: Create app_role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'generator', 'transporter', 'recycler', 'driver');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Step 5: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: Recreate all RLS policies that were dropped
-- profiles table
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- drivers table
CREATE POLICY "Admins can manage drivers"
ON public.drivers
FOR ALL
TO authenticated
USING (public.is_admin());

-- notifications table
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (public.is_admin());

-- system_counters table
CREATE POLICY "Admins can manage counters"
ON public.system_counters
FOR ALL
TO authenticated
USING (public.is_admin());

-- system_logs table
CREATE POLICY "Admins can view all logs"
ON public.system_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- driver_locations table
CREATE POLICY "Admins can view all driver locations"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (public.is_admin());

-- gps_tracking table
CREATE POLICY "Admins can view all GPS tracking"
ON public.gps_tracking
FOR SELECT
TO authenticated
USING (public.is_admin());

-- whatsapp_notifications table
CREATE POLICY "Admins can manage WhatsApp notifications"
ON public.whatsapp_notifications
FOR ALL
TO authenticated
USING (public.is_admin());

-- companies table
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (public.is_admin());

-- auth_logs table
CREATE POLICY "Admins can view all auth logs"
ON public.auth_logs
FOR ALL
TO authenticated
USING (public.is_admin());

-- shipment_notifications table
CREATE POLICY "Admins can view all notifications"
ON public.shipment_notifications
FOR ALL
TO authenticated
USING (public.is_admin());

-- Step 7: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT user_id, role::app_role, created_at
FROM public.profiles
WHERE role IS NOT NULL AND user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;