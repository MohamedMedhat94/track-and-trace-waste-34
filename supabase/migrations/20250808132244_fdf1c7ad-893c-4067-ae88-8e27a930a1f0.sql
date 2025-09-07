-- Create admin user and set up system improvements
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'Abdullah1@gmail.com';
  
  -- If admin doesn't exist, we need to create manually through the profiles table
  -- Note: In production, admin should be created through Supabase Auth UI
  
  -- Insert admin profile if it doesn't exist
  INSERT INTO public.profiles (user_id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Abdullah1@gmail.com',
    'Abdullah Admin',
    'admin',
    true,
    now(),
    now()
  ) ON CONFLICT (email) DO NOTHING;
  
  -- Update companies table to add status tracking
  ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
  
  -- Update profiles to ensure proper account activation control
  ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES public.profiles(user_id),
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
  
  -- Create function to activate/deactivate users (admin only)
  CREATE OR REPLACE FUNCTION public.activate_user(target_user_id UUID, activate BOOLEAN)
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
  AS $function$
  BEGIN
    -- Only admins can activate/deactivate users
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: Only admins can activate/deactivate users';
    END IF;
    
    UPDATE profiles 
    SET 
      is_active = activate,
      activated_by = CASE WHEN activate THEN auth.uid() ELSE NULL END,
      activated_at = CASE WHEN activate THEN now() ELSE NULL END,
      updated_at = now()
    WHERE user_id = target_user_id;
  END;
  $function$;
  
  -- Create GPS tracking table for real-time driver tracking
  CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    speed NUMERIC,
    heading NUMERIC,
    accuracy NUMERIC,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true
  );
  
  -- Enable RLS on driver_locations
  ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
  
  -- Create policies for driver_locations
  CREATE POLICY "Admins can view all driver locations" 
  ON public.driver_locations 
  FOR SELECT 
  USING (get_current_user_role() = 'admin');
  
  CREATE POLICY "Drivers can insert their location" 
  ON public.driver_locations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers 
      WHERE id = driver_locations.driver_id AND user_id = auth.uid()
    )
  );
  
  -- Create function to update driver location
  CREATE OR REPLACE FUNCTION public.update_driver_current_location(
    driver_id_param UUID,
    latitude_param NUMERIC,
    longitude_param NUMERIC,
    speed_param NUMERIC DEFAULT NULL,
    heading_param NUMERIC DEFAULT NULL,
    accuracy_param NUMERIC DEFAULT NULL
  )
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
  AS $function$
  BEGIN
    -- Update driver's current location
    UPDATE drivers 
    SET 
      current_latitude = latitude_param,
      current_longitude = longitude_param,
      last_location_update = now(),
      last_ping = now(),
      is_online = true
    WHERE id = driver_id_param AND user_id = auth.uid();
    
    -- Insert location history
    INSERT INTO driver_locations (
      driver_id, latitude, longitude, speed, heading, accuracy
    ) VALUES (
      driver_id_param, latitude_param, longitude_param, 
      speed_param, heading_param, accuracy_param
    );
  END;
  $function$;
  
  -- Add shipment tracking improvements
  ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS current_driver_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS current_driver_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT true;
  
  -- Create automated cleanup for old location data
  CREATE OR REPLACE FUNCTION public.cleanup_old_locations()
  RETURNS VOID
  LANGUAGE plpgsql
  AS $function$
  BEGIN
    -- Keep only last 24 hours of location data per driver
    DELETE FROM driver_locations 
    WHERE recorded_at < now() - INTERVAL '24 hours';
    
    -- Keep only last 1000 route tracking records per driver
    DELETE FROM route_tracking 
    WHERE id NOT IN (
      SELECT id FROM route_tracking 
      ORDER BY recorded_at DESC 
      LIMIT 1000
    );
  END;
  $function$;
  
END $$;