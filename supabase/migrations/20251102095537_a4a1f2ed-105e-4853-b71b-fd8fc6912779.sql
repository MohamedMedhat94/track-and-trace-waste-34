-- إنشاء دالة لحذف جميع الشركات (للمسؤولين فقط)
CREATE OR REPLACE FUNCTION public.delete_all_companies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- التحقق من أن المستخدم الحالي مسؤول
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can delete all companies';
  END IF;
  
  -- حذف جميع الشحنات
  DELETE FROM shipments;
  
  -- حذف جميع السائقين
  DELETE FROM drivers;
  
  -- حذف جميع توقيعات الشركات
  DELETE FROM company_signatures;
  
  -- حذف جميع موافقات الشروط والأحكام
  DELETE FROM terms_acceptance WHERE company_id IS NOT NULL;
  
  -- حذف جميع الشركات (ما عدا الشركات المرتبطة بحسابات مسؤولين)
  DELETE FROM companies 
  WHERE id NOT IN (
    SELECT COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
    FROM profiles 
    WHERE role = 'admin' AND company_id IS NOT NULL
  );
  
  -- حذف profiles للمستخدمين الذين ليسوا مسؤولين وليس لديهم شركة
  DELETE FROM auth.users 
  WHERE id IN (
    SELECT user_id FROM profiles 
    WHERE role != 'admin' AND company_id IS NULL
  );
  
  -- حذف profiles للمستخدمين الذين ليسوا مسؤولين
  DELETE FROM profiles 
  WHERE role != 'admin' AND company_id IS NULL;
  
  -- إعادة تعيين العدادات
  UPDATE system_counters SET count = 0 WHERE counter_type = 'companies';
  UPDATE system_counters SET count = 0 WHERE counter_type = 'drivers';
  UPDATE system_counters SET count = 0 WHERE counter_type = 'shipments';
  
END;
$function$;