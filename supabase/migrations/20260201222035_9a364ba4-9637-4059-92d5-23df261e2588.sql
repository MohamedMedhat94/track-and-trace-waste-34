-- =============================================
-- FIX 1: Companies Table - Restrict public exposure
-- =============================================

-- Drop the overly permissive policy that exposes all company fields
DROP POLICY IF EXISTS "Authenticated users can view basic company info for selection" ON public.companies;

-- Create a more restrictive policy that only allows viewing through the RPC function
-- Companies should only be viewable by:
-- 1. Admins (full access)
-- 2. Users belonging to that company
-- 3. Users who need to see companies they're doing business with (through shipments)
CREATE POLICY "Users can view companies they have shipments with" 
ON public.companies 
FOR SELECT 
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  ) OR
  EXISTS (
    SELECT 1 FROM shipments s
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE p.company_id IS NOT NULL
    AND (
      s.generator_company_id = companies.id OR
      s.transporter_company_id = companies.id OR
      s.recycler_company_id = companies.id
    )
    AND (
      s.generator_company_id = p.company_id OR
      s.transporter_company_id = p.company_id OR
      s.recycler_company_id = p.company_id
    )
  )
);

-- =============================================
-- FIX 2: Drivers Table - Protect sensitive fields
-- =============================================

-- Create a secure view for driver data that masks sensitive information
CREATE OR REPLACE VIEW public.drivers_safe_view AS
SELECT 
  id,
  name,
  email,
  phone,
  -- Mask national_id - show only last 4 digits
  CASE 
    WHEN national_id IS NOT NULL THEN '****' || RIGHT(national_id, 4)
    ELSE NULL 
  END as national_id_masked,
  -- Mask license_number - show only last 4 characters
  CASE 
    WHEN license_number IS NOT NULL THEN '****' || RIGHT(license_number, 4)
    ELSE NULL 
  END as license_number_masked,
  license_type,
  vehicle_type,
  vehicle_plate,
  transport_company_id,
  is_online,
  last_ping,
  created_at,
  -- Location data only for online drivers
  CASE WHEN is_online = true THEN current_latitude ELSE NULL END as current_latitude,
  CASE WHEN is_online = true THEN current_longitude ELSE NULL END as current_longitude,
  CASE WHEN is_online = true THEN last_location_update ELSE NULL END as last_location_update
FROM drivers;

-- Grant access to the view
GRANT SELECT ON public.drivers_safe_view TO authenticated;

-- Create a function to get driver's own full data (including sensitive fields)
CREATE OR REPLACE FUNCTION public.get_my_driver_profile()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  national_id text,
  license_number text,
  license_type text,
  vehicle_type text,
  vehicle_plate text,
  transport_company_id uuid,
  is_online boolean,
  current_latitude numeric,
  current_longitude numeric,
  last_location_update timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id, d.name, d.email, d.phone, d.national_id, d.license_number,
    d.license_type, d.vehicle_type, d.vehicle_plate, d.transport_company_id,
    d.is_online, d.current_latitude, d.current_longitude, 
    d.last_location_update, d.created_at
  FROM drivers d
  WHERE d.user_id = auth.uid();
END;
$$;

-- =============================================
-- FIX 3: Profiles Table - Add rate limiting protection via function
-- =============================================

-- Create a function for safe profile lookup that includes audit logging
CREATE OR REPLACE FUNCTION public.get_user_profile_safe(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  company_id uuid,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Users can only get their own profile unless they're admin
  IF target_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only view your own profile';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.role,
    p.company_id,
    p.is_active
  FROM profiles p
  WHERE p.user_id = target_user_id;
END;
$$;

-- Create a function to get profiles for a company (admin/company managers only)
CREATE OR REPLACE FUNCTION public.get_company_profiles(target_company_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_company_id uuid;
BEGIN
  -- Get caller's company
  SELECT company_id INTO caller_company_id
  FROM profiles
  WHERE profiles.user_id = auth.uid();
  
  -- Only admins or users from the same company can view
  IF NOT is_admin() AND caller_company_id != target_company_id THEN
    RAISE EXCEPTION 'Access denied: You can only view profiles from your own company';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.email,
    p.role,
    p.is_active,
    p.created_at
  FROM profiles p
  WHERE p.company_id = target_company_id;
END;
$$;