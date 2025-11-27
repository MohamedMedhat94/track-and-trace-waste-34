-- إضافة حقول جديدة لجدول الشركات
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS industrial_registry TEXT,
ADD COLUMN IF NOT EXISTS tax_card_no TEXT,
ADD COLUMN IF NOT EXISTS waste_license_no TEXT;

-- تعليق على الحقول الجديدة
COMMENT ON COLUMN public.companies.industrial_registry IS 'رقم السجل الصناعي';
COMMENT ON COLUMN public.companies.tax_card_no IS 'رقم البطاقة الضريبية';
COMMENT ON COLUMN public.companies.waste_license_no IS 'رقم ترخيص جهاز المخلفات';

-- تحديث RLS policies للسماح للسائق بإنشاء الشحنات
DROP POLICY IF EXISTS "Drivers can create shipments" ON public.shipments;
CREATE POLICY "Drivers can create shipments"
ON public.shipments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'driver'
  )
);

-- السماح للسائق بمشاهدة الشحنات المخصصة له
DROP POLICY IF EXISTS "Drivers can view their shipments" ON public.shipments;
CREATE POLICY "Drivers can view their shipments"
ON public.shipments
FOR SELECT
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);