-- Fix security vulnerability: Restrict access to companies table
-- Remove the overly permissive policy that allows anyone to view all company data
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;

-- Drop existing policies to avoid conflicts during re-creation
-- This ensures a clean slate before applying the refined policies.
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Basic company info for authenticated users" ON public.companies;

-- Policy 1: Admins can view all companies
-- Allows users with 'admin' role in public.profiles to see all company records.
CREATE POLICY "Admins can view all companies" 
ON public.companies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy 2: Users can only view their own company data (if not admin)
-- Allows regular users to see only company records where their profile's company_id matches the company's id.
-- The 'AND NOT EXISTS' clause ensures this policy does not apply to admins, preventing unintended overlaps.
CREATE POLICY "Users can view their own company" 
ON public.companies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND company_id = companies.id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add a security function to get safe company data for public use
-- This function is SECURITY DEFINER, meaning it runs with the privileges of its creator and bypasses RLS policies on 'companies'.
-- It's designed to provide a limited set of non-sensitive company data for general selection/dropdowns.
CREATE OR REPLACE FUNCTION public.get_companies_for_selection()
RETURNS TABLE(
  id uuid,
  name text,
  type text,
  location_address text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return basic company information needed for dropdowns/selection
  -- Exclude all sensitive business data
  SELECT c.id, c.name, c.type, c.location_address
  FROM companies c
  WHERE c.is_active = true
  ORDER BY c.name;
$$;