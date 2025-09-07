-- Fix security vulnerability: Remove overly permissive company selection policy
-- and ensure only authenticated users can access limited company data

-- Drop the insecure policy that allows public access to all company data
DROP POLICY IF EXISTS "Companies visible for selection" ON public.companies;

-- Create a secure policy for authenticated users to access basic company info
CREATE POLICY "Authenticated users can view basic company info for selection"
ON public.companies
FOR SELECT
TO authenticated
USING (is_active = true AND status = 'active');

-- Update the existing function to be more explicit about security
CREATE OR REPLACE FUNCTION public.get_companies_for_selection()
RETURNS TABLE(id uuid, name text, type text, location_address text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only return basic company information needed for dropdowns/selection
  -- Exclude all sensitive business data like emails, phones, tax IDs, etc.
  SELECT c.id, c.name, c.type, c.location_address
  FROM companies c
  WHERE c.is_active = true 
    AND c.status = 'active'
  ORDER BY c.name;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.get_companies_for_selection() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_companies_for_selection() TO authenticated;