-- Make drivers visible to all authenticated users for selection across companies
DROP POLICY IF EXISTS "Transporters can view drivers for shipments" ON public.drivers;
DROP POLICY IF EXISTS "Company members can view company drivers" ON public.drivers;

-- Broader: any authenticated user can view driver list (for selection in shipments)
CREATE POLICY "Authenticated users can view drivers" 
ON public.drivers 
FOR SELECT 
TO authenticated
USING (true);

-- Keep existing self-access policies untouched
-- Drivers can update their own profile and view themselves remain as defined
