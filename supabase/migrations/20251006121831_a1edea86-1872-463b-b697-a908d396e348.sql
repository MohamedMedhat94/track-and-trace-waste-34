-- إصلاح وظيفة get_company_shipments لضمان إرجاع الشحنات بشكل فوري للشركات المعنية
CREATE OR REPLACE FUNCTION public.get_company_shipments(company_type text)
RETURNS TABLE(
  id uuid,
  shipment_number text,
  status text,
  quantity numeric,
  created_at timestamp with time zone,
  waste_type_name text,
  generator_company_name text,
  transporter_company_name text,
  recycler_company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_company_id uuid;
BEGIN
  -- الحصول على معرف شركة المستخدم الحالي
  SELECT company_id INTO current_company_id
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- تسجيل للتتبع
  RAISE LOG 'get_company_shipments called for company_type: %, current_company_id: %', company_type, current_company_id;
  
  IF current_company_id IS NULL THEN
    RAISE LOG 'User % has no company_id', auth.uid();
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.shipment_number,
    s.status,
    s.quantity,
    s.created_at,
    wt.name as waste_type_name,
    gc.name as generator_company_name,
    tc.name as transporter_company_name,
    rc.name as recycler_company_name
  FROM shipments s
  LEFT JOIN waste_types wt ON s.waste_type_id = wt.id
  LEFT JOIN companies gc ON s.generator_company_id = gc.id
  LEFT JOIN companies tc ON s.transporter_company_id = tc.id
  LEFT JOIN companies rc ON s.recycler_company_id = rc.id
  WHERE 
    CASE 
      WHEN company_type = 'generator' THEN s.generator_company_id = current_company_id
      WHEN company_type = 'transporter' THEN s.transporter_company_id = current_company_id
      WHEN company_type = 'recycler' THEN s.recycler_company_id = current_company_id
      ELSE false
    END
  ORDER BY s.created_at DESC;
END;
$$;

-- تحديث RLS policies للسماح لجميع الشركات المرتبطة برؤية الشحنات
DROP POLICY IF EXISTS "Company users can view their company shipments" ON shipments;

CREATE POLICY "Company users can view their company shipments"
ON shipments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND (
      profiles.company_id = shipments.generator_company_id OR
      profiles.company_id = shipments.transporter_company_id OR
      profiles.company_id = shipments.recycler_company_id
    )
  )
);

-- إضافة policy لتحديث الشحنات من قبل شركات النقل
DROP POLICY IF EXISTS "Transporter users can update shipments" ON shipments;

CREATE POLICY "Transporter users can update shipments"
ON shipments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = shipments.transporter_company_id
  )
);

-- إضافة policy لتحديث الشحنات من قبل شركات إعادة التدوير
DROP POLICY IF EXISTS "Recycler users can update shipments" ON shipments;

CREATE POLICY "Recycler users can update shipments"
ON shipments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = shipments.recycler_company_id
  )
);

-- تحديث policy لإنشاء الشحنات لتشمل شركات النقل
DROP POLICY IF EXISTS "Transporter users can create shipments" ON shipments;

CREATE POLICY "Transporter users can create shipments"
ON shipments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND (
      profiles.role = 'admin' OR
      profiles.company_id = shipments.transporter_company_id
    )
  )
);