-- إصلاح RLS policies لجدول companies لحل مشكلة تسجيل المستخدمين

-- إزالة policy الإدارة الموجودة وإنشاء policies منفصلة أكثر وضوحاً
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;

-- السماح للمدراء بعرض جميع الشركات
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- السماح للمدراء بإدراج شركات جديدة
CREATE POLICY "Admins can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (get_current_user_role() = 'admin');

-- السماح للمدراء بتحديث الشركات
CREATE POLICY "Admins can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- السماح للمدراء بحذف الشركات
CREATE POLICY "Admins can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'admin');

-- السماح للمستخدمين العاديين بإدراج شركاتهم الخاصة عند التسجيل
CREATE POLICY "Users can insert their own company"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by OR get_current_user_role() = 'admin');

-- إصلاح مشكلة UUID validation في profiles
-- التأكد من أن profiles يمكن إدراجها بشكل صحيح
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);