-- Add authentication checks to get_companies_for_selection
CREATE OR REPLACE FUNCTION public.get_companies_for_selection()
RETURNS TABLE(id uuid, name text, type text, location_address text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Only allow authenticated users with relevant roles
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'transporter', 'generator', 'recycler')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  RETURN QUERY
  SELECT c.id, c.name, c.type, c.location_address
  FROM companies c
  WHERE c.is_active = true
  ORDER BY c.name;
END;
$$;

-- Add authentication checks to get_drivers_for_selection
CREATE OR REPLACE FUNCTION public.get_drivers_for_selection()
RETURNS TABLE(id uuid, name text, vehicle_type text, vehicle_plate text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Only allow authenticated users with relevant roles
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'transporter', 'generator', 'recycler')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  RETURN QUERY
  SELECT d.id, d.name, d.vehicle_type, d.vehicle_plate
  FROM drivers d
  WHERE d.name IS NOT NULL
  ORDER BY d.name;
END;
$$;