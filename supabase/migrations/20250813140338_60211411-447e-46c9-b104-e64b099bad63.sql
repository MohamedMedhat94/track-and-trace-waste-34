-- حذف جميع policies للشركات وإعادة إنشائها بطريقة صحيحة
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

-- إنشاء policies جديدة للشركات
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'admin');

-- السماح للمستخدمين بعرض شركاتهم
CREATE POLICY "Users can view their own company"
ON public.companies
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.company_id = companies.id
));

-- إضافة policy للسماح للمستخدمين بإدراج شركاتهم (إذا لم يكونوا مدراء)
CREATE POLICY "Users can insert their company during signup"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);