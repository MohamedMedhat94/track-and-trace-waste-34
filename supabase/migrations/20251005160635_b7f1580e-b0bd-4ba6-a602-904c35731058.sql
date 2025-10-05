-- Add authorization checks to location tracking functions

-- Fix update_driver_location to verify driver ownership or admin access
CREATE OR REPLACE FUNCTION public.update_driver_location(driver_id_param uuid, latitude_param numeric, longitude_param numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify the caller is either the driver or an admin
  IF NOT EXISTS (
    SELECT 1 FROM drivers 
    WHERE id = driver_id_param AND user_id = auth.uid()
  ) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only update your own location';
  END IF;

  UPDATE public.drivers 
  SET 
    current_latitude = latitude_param,
    current_longitude = longitude_param,
    last_location_update = now(),
    last_ping = now()
  WHERE id = driver_id_param;
END;
$function$;

-- Fix update_driver_gps to verify driver ownership or admin access
CREATE OR REPLACE FUNCTION public.update_driver_gps(driver_id_param uuid, latitude_param numeric, longitude_param numeric, speed_param numeric DEFAULT NULL, heading_param numeric DEFAULT NULL, shipment_id_param uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify the caller is either the driver or an admin
  IF NOT EXISTS (
    SELECT 1 FROM drivers 
    WHERE id = driver_id_param AND user_id = auth.uid()
  ) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only update your own GPS data';
  END IF;

  -- Update driver current location
  UPDATE drivers 
  SET 
    current_latitude = latitude_param,
    current_longitude = longitude_param,
    last_location_update = now(),
    last_ping = now(),
    is_online = true
  WHERE id = driver_id_param;
  
  -- Insert GPS tracking record
  INSERT INTO gps_tracking (
    driver_id, shipment_id, latitude, longitude, speed, heading
  ) VALUES (
    driver_id_param, shipment_id_param, latitude_param, longitude_param, speed_param, heading_param
  );
END;
$function$;

-- Fix add_driver_location_point to verify driver ownership or admin access
CREATE OR REPLACE FUNCTION public.add_driver_location_point(driver_id_param uuid, latitude_param numeric, longitude_param numeric, address_param text DEFAULT NULL, location_type_param text DEFAULT 'waypoint', shipment_id_param uuid DEFAULT NULL, speed_param numeric DEFAULT NULL, heading_param numeric DEFAULT NULL, accuracy_param numeric DEFAULT NULL, notes_param text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  point_id UUID;
BEGIN
  -- Verify the caller is either the driver or an admin
  IF NOT EXISTS (
    SELECT 1 FROM drivers 
    WHERE id = driver_id_param AND user_id = auth.uid()
  ) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only add location points for yourself';
  END IF;

  -- Insert the location point
  INSERT INTO driver_route_history (
    driver_id, shipment_id, latitude, longitude, address,
    location_type, speed, heading, accuracy, notes
  ) VALUES (
    driver_id_param, shipment_id_param, latitude_param, longitude_param, address_param,
    location_type_param, speed_param, heading_param, accuracy_param, notes_param
  ) RETURNING id INTO point_id;
  
  -- Update driver's current location
  UPDATE drivers 
  SET 
    current_latitude = latitude_param,
    current_longitude = longitude_param,
    last_location_update = now(),
    last_ping = now(),
    is_online = true
  WHERE id = driver_id_param;
  
  RETURN point_id;
END;
$function$;

-- Fix get_drivers_for_tracking to require admin access
CREATE OR REPLACE FUNCTION public.get_drivers_for_tracking()
RETURNS TABLE(id uuid, name text, vehicle_type text, vehicle_plate text, current_latitude numeric, current_longitude numeric, last_location_update timestamp with time zone, is_online boolean, last_ping timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can track all drivers
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can track driver locations';
  END IF;

  RETURN QUERY
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
END;
$function$;

-- Fix update_driver_location_with_route to verify driver ownership or admin access
CREATE OR REPLACE FUNCTION public.update_driver_location_with_route(driver_id_param uuid, latitude_param numeric, longitude_param numeric, speed_param numeric DEFAULT NULL, heading_param numeric DEFAULT NULL, shipment_id_param uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify the caller is either the driver or an admin
  IF NOT EXISTS (
    SELECT 1 FROM drivers 
    WHERE id = driver_id_param AND user_id = auth.uid()
  ) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: You can only update your own location';
  END IF;

  -- Update driver current location
  UPDATE drivers 
  SET 
    current_latitude = latitude_param,
    current_longitude = longitude_param,
    last_location_update = now(),
    last_ping = now(),
    is_online = true
  WHERE id = driver_id_param;
  
  -- Insert route tracking record
  INSERT INTO route_tracking (
    driver_id, shipment_id, latitude, longitude, speed, heading
  ) VALUES (
    driver_id_param, shipment_id_param, latitude_param, longitude_param, speed_param, heading_param
  );
  
  -- Update route history in drivers table
  UPDATE drivers 
  SET route_history = COALESCE(route_history, '[]'::jsonb) || 
    jsonb_build_object(
      'latitude', latitude_param,
      'longitude', longitude_param,
      'timestamp', now(),
      'speed', speed_param,
      'heading', heading_param
    )
  WHERE id = driver_id_param;
END;
$function$;

-- Add authorization to log_auth_event to prevent abuse
CREATE OR REPLACE FUNCTION public.log_auth_event(user_id_param uuid, email_param text, action_param text, ip_param text DEFAULT NULL, user_agent_param text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  log_id uuid;
BEGIN
  -- Only allow logging for the current user or if admin
  IF user_id_param != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Cannot log auth events for other users';
  END IF;

  INSERT INTO auth_logs (user_id, email, action, ip_address, user_agent)
  VALUES (user_id_param, email_param, action_param, ip_param, user_agent_param)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;