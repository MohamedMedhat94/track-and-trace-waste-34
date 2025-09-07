-- System improvements for waste management platform
DO $$
BEGIN
  -- Update companies table to add status tracking
  ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
  
  -- Update profiles to ensure proper account activation control
  ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS activated_by UUID,
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
  
  -- Update new users to be inactive by default (except admins)
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'generator'),
      -- Admin accounts are active by default, others need activation
      CASE 
        WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', 'generator') = 'admin' THEN true
        ELSE false
      END
    );
    RETURN NEW;
  EXCEPTION
    WHEN unique_violation THEN
      -- Handle case where profile already exists
      RETURN NEW;
  END;
  $function$;
  
END $$;