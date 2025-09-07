-- Allow unauthenticated users to create companies
-- This allows new users to register their companies without authentication first

-- Drop the current restrictive companies INSERT policy 
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;

-- Create a new policy that allows anyone to insert companies
CREATE POLICY "Anyone can create companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (true);

-- Keep existing SELECT and UPDATE policies as they are for security
-- This allows public company registration while maintaining data protection