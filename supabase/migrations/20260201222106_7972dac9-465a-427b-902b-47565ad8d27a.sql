-- Fix Security Definer View issue
-- Drop the view and recreate it with SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.drivers_safe_view;

-- Recreate view without SECURITY DEFINER (uses INVOKER by default)
-- This means RLS policies on drivers table will still apply
CREATE VIEW public.drivers_safe_view 
WITH (security_invoker = true)
AS
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