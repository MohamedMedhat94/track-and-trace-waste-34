-- Create storage bucket for company signatures and stamps
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents',
  false,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
);

-- Create table for company signatures and stamps
CREATE TABLE IF NOT EXISTS public.company_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  signature_image_url TEXT,
  stamp_image_url TEXT,
  signature_uploaded_at TIMESTAMP WITH TIME ZONE,
  stamp_uploaded_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id)
);

-- Add report field to shipments table
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS shipment_report TEXT,
ADD COLUMN IF NOT EXISTS report_created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS report_created_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on company_signatures table
ALTER TABLE public.company_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_signatures
CREATE POLICY "Companies can view their own signatures"
ON public.company_signatures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = company_signatures.company_id
  )
);

CREATE POLICY "Companies can insert their signatures"
ON public.company_signatures
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = company_signatures.company_id
  )
);

CREATE POLICY "Companies can update their signatures"
ON public.company_signatures
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = company_signatures.company_id
  )
);

CREATE POLICY "Admins can manage all signatures"
ON public.company_signatures
FOR ALL
USING (is_admin());

-- Storage RLS policies for company-documents bucket
CREATE POLICY "Companies can upload their documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Companies can view their documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'company-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
    )
    OR is_admin()
  )
);

CREATE POLICY "Companies can update their documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Companies can delete their documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- Create function to add shipment report
CREATE OR REPLACE FUNCTION public.add_shipment_report(
  shipment_id_param UUID,
  report_text TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is recycler, transporter, or admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    JOIN shipments s ON (
      (p.role = 'recycler' AND s.recycler_company_id = p.company_id) OR
      (p.role = 'transporter' AND s.transporter_company_id = p.company_id) OR
      p.role = 'admin'
    )
    WHERE p.user_id = auth.uid() AND s.id = shipment_id_param
  ) THEN
    RAISE EXCEPTION 'Access denied: Only recycler, transporter, or admin can add reports';
  END IF;
  
  -- Update shipment with report
  UPDATE shipments
  SET 
    shipment_report = report_text,
    report_created_by = auth.uid(),
    report_created_at = now(),
    updated_at = now()
  WHERE id = shipment_id_param;
END;
$$;

-- Create function to get shipments with signatures for PDF
CREATE OR REPLACE FUNCTION public.get_shipment_with_signatures(shipment_id_param UUID)
RETURNS TABLE (
  shipment_data JSONB,
  generator_signature TEXT,
  generator_stamp TEXT,
  transporter_signature TEXT,
  transporter_stamp TEXT,
  recycler_signature TEXT,
  recycler_stamp TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_jsonb(s.*) as shipment_data,
    gs.signature_image_url as generator_signature,
    gs.stamp_image_url as generator_stamp,
    ts.signature_image_url as transporter_signature,
    ts.stamp_image_url as transporter_stamp,
    rs.signature_image_url as recycler_signature,
    rs.stamp_image_url as recycler_stamp
  FROM shipments s
  LEFT JOIN company_signatures gs ON s.generator_company_id = gs.company_id
  LEFT JOIN company_signatures ts ON s.transporter_company_id = ts.company_id
  LEFT JOIN company_signatures rs ON s.recycler_company_id = rs.company_id
  WHERE s.id = shipment_id_param;
END;
$$;

-- Add trigger to update updated_at on company_signatures
CREATE OR REPLACE TRIGGER update_company_signatures_updated_at
BEFORE UPDATE ON public.company_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_company_signatures_company_id 
ON public.company_signatures(company_id);

CREATE INDEX IF NOT EXISTS idx_shipments_report_created_by 
ON public.shipments(report_created_by);

-- Add comment for documentation
COMMENT ON TABLE public.company_signatures IS 'Stores company signatures and stamps for PDF generation';
COMMENT ON COLUMN public.shipments.shipment_report IS 'Report text added by recycler or transporter';
