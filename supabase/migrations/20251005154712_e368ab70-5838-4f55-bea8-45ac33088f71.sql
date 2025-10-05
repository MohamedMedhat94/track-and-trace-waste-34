-- إصلاح سياسة RLS للسماح لشركات إعادة التدوير برؤية شحناتها
DROP POLICY IF EXISTS "Company users can view their company shipments" ON public.shipments;

CREATE POLICY "Company users can view their company shipments" 
ON public.shipments
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.company_id = shipments.generator_company_id OR 
      profiles.company_id = shipments.transporter_company_id OR 
      profiles.company_id = shipments.recycler_company_id
    )
  )
);