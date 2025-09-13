-- Remove the overly permissive policy that allows any authenticated user to view all driver data
DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;

-- Create secure functions for legitimate use cases

-- Function for getting drivers for selection dropdowns (minimal data only)
CREATE OR REPLACE FUNCTION public.get_drivers_for_selection()
RETURNS TABLE(id UUID, name TEXT, vehicle_type TEXT, vehicle_plate TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.vehicle_type, d.vehicle_plate
  FROM drivers d
  WHERE d.name IS NOT NULL
  ORDER BY d.name;
$$;

-- Function for getting driver location data for tracking (no personal info)
CREATE OR REPLACE FUNCTION public.get_drivers_for_tracking()
RETURNS TABLE(
  id UUID, 
  name TEXT, 
  vehicle_type TEXT, 
  vehicle_plate TEXT, 
  current_latitude NUMERIC, 
  current_longitude NUMERIC, 
  last_location_update TIMESTAMPTZ,
  is_online BOOLEAN,
  last_ping TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id, 
    d.name, 
    d.vehicle_type, 
    d.vehicle_plate, 
    d.current_latitude, 
    d.current_longitude, 
    d.last_location_update,
    d.is_online,
    d.last_ping
  FROM drivers d
  WHERE d.current_latitude IS NOT NULL 
    AND d.current_longitude IS NOT NULL
    AND d.name IS NOT NULL
  ORDER BY d.name;
$$;

-- Function for getting active drivers (admin only)
CREATE OR REPLACE FUNCTION public.get_active_drivers()
RETURNS TABLE(
  id UUID, 
  name TEXT, 
  email TEXT,
  phone TEXT,
  vehicle_type TEXT, 
  vehicle_plate TEXT, 
  current_latitude NUMERIC, 
  current_longitude NUMERIC, 
  last_ping TIMESTAMPTZ,
  is_online BOOLEAN,
  transport_company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can access this function
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can view active drivers';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.id, 
    d.name, 
    d.email,
    d.phone,
    d.vehicle_type, 
    d.vehicle_plate, 
    d.current_latitude, 
    d.current_longitude, 
    d.last_ping,
    d.is_online,
    d.transport_company_id
  FROM drivers d
  WHERE d.is_online = true 
    AND d.last_ping >= (now() - interval '10 minutes')
  ORDER BY d.last_ping DESC;
END;
$$;

-- Function for getting all drivers (admin only)
CREATE OR REPLACE FUNCTION public.get_all_drivers()
RETURNS TABLE(
  id UUID, 
  name TEXT, 
  email TEXT,
  phone TEXT,
  national_id TEXT,
  license_number TEXT,
  license_type TEXT,
  vehicle_type TEXT, 
  vehicle_plate TEXT, 
  location_address TEXT,
  transport_company_id UUID,
  created_at TIMESTAMPTZ,
  is_online BOOLEAN,
  last_ping TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can access this function
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can view all drivers';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.id, 
    d.name, 
    d.email,
    d.phone,
    d.national_id,
    d.license_number,
    d.license_type,
    d.vehicle_type, 
    d.vehicle_plate, 
    d.location_address,
    d.transport_company_id,
    d.created_at,
    d.is_online,
    d.last_ping
  FROM drivers d
  ORDER BY d.created_at DESC;
END;
$$;

-- Function to get driver info for PDF generation (minimal data)
CREATE OR REPLACE FUNCTION public.get_driver_for_pdf(driver_id_param UUID)
RETURNS TABLE(id UUID, name TEXT, phone TEXT, license_number TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.phone, d.license_number
  FROM drivers d
  WHERE d.id = driver_id_param;
$$;