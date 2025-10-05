-- Fix get_drivers_for_selection to allow drivers to access the list
CREATE OR REPLACE FUNCTION public.get_drivers_for_selection()
 RETURNS TABLE(id uuid, name text, vehicle_type text, vehicle_plate text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Only allow authenticated users with relevant roles (including drivers)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'transporter', 'generator', 'recycler', 'driver')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  RETURN QUERY
  SELECT d.id, d.name, d.vehicle_type, d.vehicle_plate
  FROM drivers d
  WHERE d.name IS NOT NULL
  ORDER BY d.name;
END;
$function$;