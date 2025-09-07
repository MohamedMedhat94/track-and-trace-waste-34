-- Create system logs table for activity tracking (without the auth.users issue)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for system logs
CREATE POLICY "Admins can view all logs" 
ON public.system_logs 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "System can insert logs" 
ON public.system_logs 
FOR INSERT 
WITH CHECK (true);

-- Add drivers column to companies table to link drivers
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS drivers_count INTEGER DEFAULT 0;

-- Add location tracking to drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS current_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS current_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add company category display name
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS category_display_name TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN type = 'generator' THEN 'شركة مولدة للنفايات'
    WHEN type = 'transporter' THEN 'شركة نقل'
    WHEN type = 'recycler' THEN 'شركة إعادة تدوير'
    ELSE type
  END
) STORED;

-- Function to log system activities
CREATE OR REPLACE FUNCTION public.log_system_activity(
  action_type_param TEXT,
  entity_type_param TEXT,
  entity_id_param TEXT DEFAULT NULL,
  details_param JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
  current_user_email TEXT;
BEGIN
  -- Get current user email from profiles
  SELECT email INTO current_user_email 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  INSERT INTO public.system_logs (
    user_id,
    user_email,
    action_type,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    auth.uid(),
    current_user_email,
    action_type_param,
    entity_type_param,
    entity_id_param,
    details_param
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Trigger to log company creation
CREATE OR REPLACE FUNCTION public.log_company_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_system_activity(
    'CREATE',
    'company',
    NEW.id::text,
    jsonb_build_object(
      'company_name', NEW.name,
      'company_type', NEW.type,
      'address', NEW.address
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger to log driver creation
CREATE OR REPLACE FUNCTION public.log_driver_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_system_activity(
    'CREATE',
    'driver',
    NEW.id::text,
    jsonb_build_object(
      'driver_name', NEW.name,
      'license_number', NEW.license_number,
      'transport_company_id', NEW.transport_company_id
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger to log shipment creation
CREATE OR REPLACE FUNCTION public.log_shipment_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_system_activity(
    'CREATE',
    'shipment',
    NEW.id::text,
    jsonb_build_object(
      'shipment_number', NEW.shipment_number,
      'status', NEW.status,
      'quantity', NEW.quantity,
      'generator_company_id', NEW.generator_company_id,
      'transporter_company_id', NEW.transporter_company_id,
      'recycler_company_id', NEW.recycler_company_id
    )
  );
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS log_company_creation_trigger ON public.companies;
CREATE TRIGGER log_company_creation_trigger
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.log_company_creation();

DROP TRIGGER IF EXISTS log_driver_creation_trigger ON public.drivers;
CREATE TRIGGER log_driver_creation_trigger
  AFTER INSERT ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.log_driver_creation();

DROP TRIGGER IF EXISTS log_shipment_creation_trigger ON public.shipments;
CREATE TRIGGER log_shipment_creation_trigger
  AFTER INSERT ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.log_shipment_creation();