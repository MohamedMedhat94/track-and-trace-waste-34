-- Create table for terms and conditions acceptance
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  company_type TEXT NOT NULL CHECK (company_type IN ('generator', 'transporter', 'recycler')),
  
  -- Acceptance details
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  
  -- Digital signature
  full_name TEXT NOT NULL,
  signature_data TEXT, -- Base64 signature image
  company_name TEXT NOT NULL,
  company_stamp_data TEXT, -- Base64 company stamp
  
  -- Terms version
  terms_version TEXT NOT NULL DEFAULT '1.0',
  terms_content TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, terms_version)
);

-- Enable RLS
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own acceptance"
ON public.terms_acceptance
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their acceptance"
ON public.terms_acceptance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all acceptances"
ON public.terms_acceptance
FOR ALL
USING (is_admin());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user_id 
ON public.terms_acceptance(user_id);

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_company_id 
ON public.terms_acceptance(company_id);

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_company_type 
ON public.terms_acceptance(company_type);

-- Function to check if user accepted latest terms
CREATE OR REPLACE FUNCTION public.has_accepted_terms(
  user_id_param UUID,
  required_version TEXT DEFAULT '1.0'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM terms_acceptance
    WHERE user_id = user_id_param
    AND terms_version = required_version
  );
END;
$$;

-- Add terms_accepted flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- Update existing profiles to false
UPDATE public.profiles SET terms_accepted = false WHERE terms_accepted IS NULL;

COMMENT ON TABLE public.terms_acceptance IS 'Stores user acceptance of terms and conditions with digital signature';
COMMENT ON COLUMN public.terms_acceptance.signature_data IS 'Base64 encoded signature image';
COMMENT ON COLUMN public.terms_acceptance.company_stamp_data IS 'Base64 encoded company stamp image';
