-- Add RLS policy to allow transporters to view drivers for shipment assignment
DROP POLICY IF EXISTS "Transporters can view drivers for shipments" ON public.drivers;

CREATE POLICY "Transporters can view drivers for shipments" 
ON public.drivers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'transporter')
  )
);

-- Also allow company members to view drivers from their company
DROP POLICY IF EXISTS "Company members can view company drivers" ON public.drivers;

CREATE POLICY "Company members can view company drivers" 
ON public.drivers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = drivers.transport_company_id
  )
);