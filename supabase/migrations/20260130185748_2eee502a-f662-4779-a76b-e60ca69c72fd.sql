-- Fix the get_driver_shipments function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.get_driver_shipments()
 RETURNS TABLE(id uuid, shipment_number text, status text, quantity numeric, created_at timestamp with time zone, generator_company_name text, transporter_company_name text, recycler_company_name text, pickup_location text, delivery_location text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  drv_id uuid;
BEGIN
  -- Find the driver record for the current authenticated user
  SELECT drivers.id INTO drv_id FROM drivers WHERE drivers.user_id = auth.uid();
  
  IF drv_id IS NULL THEN
    RETURN; -- no driver record linked to this user
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.shipment_number,
    s.status,
    s.quantity,
    s.created_at,
    gc.name AS generator_company_name,
    tc.name AS transporter_company_name,
    rc.name AS recycler_company_name,
    s.pickup_location,
    s.delivery_location
  FROM shipments s
  LEFT JOIN companies gc ON s.generator_company_id = gc.id
  LEFT JOIN companies tc ON s.transporter_company_id = tc.id
  LEFT JOIN companies rc ON s.recycler_company_id = rc.id
  WHERE s.driver_id = drv_id
  ORDER BY s.created_at DESC;
END;
$function$;