-- Create table for homepage settings
CREATE TABLE public.homepage_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read homepage settings (public page)
CREATE POLICY "Homepage settings are publicly readable"
ON public.homepage_settings
FOR SELECT
USING (true);

-- Only admins can update homepage settings
CREATE POLICY "Admins can update homepage settings"
ON public.homepage_settings
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can insert homepage settings"
ON public.homepage_settings
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete homepage settings"
ON public.homepage_settings
FOR DELETE
USING (public.is_admin());

-- Insert default features
INSERT INTO public.homepage_settings (key, value, is_visible, display_order) VALUES
('feature_1', 'تتبع GPS مباشر للسائقين', true, 1),
('feature_2', 'تقارير بيئية شاملة', true, 2),
('feature_3', 'إدارة متكاملة للشحنات', true, 3),
('feature_4', 'نظام موافقات إلكتروني', true, 4);