-- Fix Critical Security Issues: Role Storage and Password Hash Columns

-- =====================================================
-- 1. CREATE SEPARATE USER_ROLES TABLE
-- =====================================================

-- Create enum for roles if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'generator', 'transporter', 'recycler', 'driver');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create RLS policies for user_roles
CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 2. UPDATE has_role() FUNCTION TO USE user_roles TABLE
-- =====================================================

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

-- =====================================================
-- 3. MIGRATE EXISTING ROLES FROM PROFILES TO USER_ROLES
-- =====================================================

INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
  user_id,
  CASE 
    WHEN role = 'admin' THEN 'admin'::app_role
    WHEN role = 'generator' THEN 'generator'::app_role
    WHEN role = 'transporter' THEN 'transporter'::app_role
    WHEN role = 'recycler' THEN 'recycler'::app_role
    WHEN role = 'driver' THEN 'driver'::app_role
    ELSE 'generator'::app_role  -- Default fallback
  END,
  created_at
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- 4. UPDATE PROFILES TABLE - REMOVE UPDATE PERMISSION FOR ROLE
-- =====================================================

-- Drop existing update policy that allows users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policy that prevents role updates
CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent role changes by ensuring role stays the same
  role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- 5. REMOVE PASSWORD HASH COLUMNS (CRITICAL SECURITY FIX)
-- =====================================================

-- Remove password_hash and username from drivers table
ALTER TABLE public.drivers DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.drivers DROP COLUMN IF EXISTS username;

-- Remove password_hash and username from companies table
ALTER TABLE public.companies DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.companies DROP COLUMN IF EXISTS username;

-- =====================================================
-- 6. CREATE HELPER FUNCTION TO GET USER ROLE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;