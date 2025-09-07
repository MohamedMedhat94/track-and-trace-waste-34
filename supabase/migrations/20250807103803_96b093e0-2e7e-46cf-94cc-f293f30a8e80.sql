-- Fix the foreign key constraint issue by removing invalid driver reference
-- First, let's remove the problematic foreign key constraint
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_driver_id_fkey;

-- Update shipments table to handle driver_id as UUID without foreign key constraint to auth.users
-- since drivers are stored in the drivers table, not auth.users
ALTER TABLE public.shipments 
ALTER COLUMN driver_id DROP NOT NULL;

-- Add comment to clarify that driver_id references drivers table
COMMENT ON COLUMN public.shipments.driver_id IS 'References drivers.id table, not auth.users';

-- Fix function search paths for security (addressing linter warnings)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.log_auth_event(user_id_param uuid, email_param text, action_param text, ip_param text DEFAULT NULL::text, user_agent_param text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.auth_logs (user_id, email, action, ip_address, user_agent)
  VALUES (user_id_param, email_param, action_param, ip_param, user_agent_param)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_driver_location(driver_id_param uuid, latitude_param numeric, longitude_param numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.drivers 
  SET 
    current_latitude = latitude_param,
    current_longitude = longitude_param,
    last_location_update = now(),
    last_ping = now()
  WHERE id = driver_id_param;
END;
$function$;