-- إصلاح مشكلة عدم ظهور الشحنات للشركات
-- تحديث المستخدمين ليكونوا مرتبطين بالشركات الصحيحة

-- أولاً، ربط بعض المستخدمين بالشركات الموجودة في الشحنات
UPDATE profiles 
SET company_id = '87658f87-2de3-4cd0-a3bb-e4091c7ff8a6' -- شركة التوحيد (ناقل)
WHERE email IN ('almtahidah@gmail.com', 'wood@gmail.com', 'swaq@gmail.com') 
AND role IN ('transporter', 'driver');

-- ربط مستخدم بشركة مولدة موجودة في الشحنات
UPDATE profiles 
SET company_id = '651612ef-73ca-48b8-92f4-789375d92ae6' 
WHERE email = 'almostaqpal11@gmail.com' AND role = 'generator';

-- ربط مستخدم بشركة مدورة موجودة في الشحنات  
UPDATE profiles 
SET company_id = 'c1a929b0-df88-4e6a-943e-0c0940ba6c67'
WHERE email = 'tadweer1@gmail.com' AND role = 'recycler';

-- تحسين دالة get_company_shipments لضمان عمل الـ real-time
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
SET search_path TO 'public'
AS $function$
DECLARE
  current_company_id uuid;
BEGIN
  -- الحصول على معرف شركة المستخدم الحالي
  SELECT company_id INTO current_company_id
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- تسجيل في السجل للتتبع
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
$function$;