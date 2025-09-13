-- إضافة دالة لربط المستخدم بشركة (للمدير فقط)
CREATE OR REPLACE FUNCTION public.assign_user_to_company(target_user_id UUID, target_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- فقط المديرون يمكنهم ربط المستخدمين بالشركات
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can assign users to companies';
  END IF;
  
  -- ربط المستخدم بالشركة
  UPDATE profiles 
  SET 
    company_id = target_company_id,
    updated_at = now()
  WHERE user_id = target_user_id;
  
  -- تسجيل العملية في السجل
  PERFORM log_system_activity(
    'ASSIGN_COMPANY',
    'user_company_assignment',
    target_user_id::text,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'company_id', target_company_id,
      'assigned_by', auth.uid()
    )
  );
END;
$$;

-- إضافة دالة للحصول على المستخدمين غير المربوطين بشركات
CREATE OR REPLACE FUNCTION public.get_unassigned_users()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  role TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- فقط المديرون يمكنهم عرض هذه البيانات
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can view unassigned users';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.role,
    p.full_name,
    p.created_at
  FROM profiles p
  WHERE p.company_id IS NULL 
    AND p.role != 'admin'
    AND p.is_active = true
  ORDER BY p.created_at DESC;
END;
$$;

-- إضافة دالة للحصول على مستخدمي شركة محددة
CREATE OR REPLACE FUNCTION public.get_company_users(target_company_id UUID)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  role TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- فقط المديرون يمكنهم عرض هذه البيانات
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can view company users';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.role,
    p.full_name,
    p.created_at
  FROM profiles p
  WHERE p.company_id = target_company_id
    AND p.is_active = true
  ORDER BY p.created_at DESC;
END;
$$;