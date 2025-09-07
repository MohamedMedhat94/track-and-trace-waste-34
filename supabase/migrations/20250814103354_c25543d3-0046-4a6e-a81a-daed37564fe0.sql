-- إصلاح مشكلة تسجيل المستخدمين
-- السماح للمستخدمين الجدد بإنشاء شركة أثناء التسجيل

-- تحديث policy لإدراج الشركات ليسمح لأي مستخدم مصادق بإنشاء شركة
DROP POLICY IF EXISTS "Users can insert their company during signup" ON public.companies;

CREATE POLICY "Allow authenticated users to insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- إضافة جدول لتخزين multiple locations للسائق
CREATE TABLE IF NOT EXISTS public.driver_route_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  address TEXT,
  location_type TEXT DEFAULT 'waypoint', -- pickup, delivery, waypoint, etc
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  speed NUMERIC,
  heading NUMERIC,
  accuracy NUMERIC,
  notes TEXT
);

-- Enable RLS for driver_route_history
ALTER TABLE public.driver_route_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for driver_route_history
CREATE POLICY "Admins can view all route history"
ON public.driver_route_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Drivers can view their route history"
ON public.driver_route_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM drivers 
    WHERE drivers.id = driver_route_history.driver_id 
    AND drivers.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can insert their route history"
ON public.driver_route_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drivers 
    WHERE drivers.id = driver_route_history.driver_id 
    AND drivers.user_id = auth.uid()
  )
);

-- Function لإضافة موقع جديد للسائق
CREATE OR REPLACE FUNCTION public.add_driver_location_point(
  driver_id_param UUID,
  latitude_param NUMERIC,
  longitude_param NUMERIC,
  address_param TEXT DEFAULT NULL,
  location_type_param TEXT DEFAULT 'waypoint',
  shipment_id_param UUID DEFAULT NULL,
  speed_param NUMERIC DEFAULT NULL,
  heading_param NUMERIC DEFAULT NULL,
  accuracy_param NUMERIC DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  point_id UUID;
BEGIN
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
$$;