-- Add enhanced shipment status tracking
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::JSONB;

-- Update status enum to include new workflow statuses
ALTER TABLE public.shipments 
DROP CONSTRAINT IF EXISTS shipments_status_check;

ALTER TABLE public.shipments 
ADD CONSTRAINT shipments_status_check 
CHECK (status IN ('pending', 'registered', 'sorting', 'transporting', 'delivered', 'completed'));

-- Create function to update shipment status with history tracking
CREATE OR REPLACE FUNCTION public.update_shipment_status(
  shipment_id_param UUID,
  new_status_param TEXT,
  notes_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  status_entry JSONB;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  SELECT email INTO current_user_email 
  FROM public.profiles 
  WHERE user_id = current_user_id;
  
  -- Create status history entry
  status_entry := jsonb_build_object(
    'status', new_status_param,
    'timestamp', now(),
    'updated_by', current_user_id,
    'updated_by_email', current_user_email,
    'notes', notes_param
  );
  
  -- Update shipment status and append to history
  UPDATE public.shipments 
  SET 
    status = new_status_param,
    status_history = COALESCE(status_history, '[]'::JSONB) || status_entry,
    updated_at = now()
  WHERE id = shipment_id_param;
END;
$$;

-- Add real-time driver tracking fields
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_ping TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to update driver location
CREATE OR REPLACE FUNCTION public.update_driver_location(
  driver_id_param UUID,
  latitude_param NUMERIC,
  longitude_param NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.drivers 
  SET 
    current_latitude = latitude_param,
    current_longitude = longitude_param,
    last_location_update = now(),
    last_ping = now()
  WHERE id = driver_id_param;
END;
$$;

-- Create function for button validation logging
CREATE OR REPLACE FUNCTION public.log_button_action(
  button_name_param TEXT,
  action_result_param TEXT,
  error_message_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.system_logs (
    user_id,
    action_type,
    entity_type,
    details
  )
  VALUES (
    auth.uid(),
    'BUTTON_ACTION',
    'ui_interaction',
    jsonb_build_object(
      'button_name', button_name_param,
      'result', action_result_param,
      'error_message', error_message_param,
      'timestamp', now()
    )
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;