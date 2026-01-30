-- Update get_companies_for_selection to allow drivers to see all companies
CREATE OR REPLACE FUNCTION public.get_companies_for_selection()
 RETURNS TABLE(id uuid, name text, type text, location_address text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Allow authenticated users with relevant roles including driver
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'transporter', 'generator', 'recycler', 'driver')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  RETURN QUERY
  SELECT c.id, c.name, c.type, c.location_address
  FROM companies c
  WHERE c.is_active = true
  ORDER BY c.name;
END;
$function$;