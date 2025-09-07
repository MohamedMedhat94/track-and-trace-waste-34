-- Fix security vulnerability: Restrict waste_entities access to authenticated users only
-- Drop the overly permissive policy that allows public access
DROP POLICY "Companies can view waste entities" ON public.waste_entities;

-- Create a new restrictive policy that only allows authenticated users with business roles to view waste entities
CREATE POLICY "Authenticated business users can view waste entities" 
ON public.waste_entities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'generator', 'transporter', 'recycler')
  )
);

-- Keep the admin management policy unchanged as it's already secure
-- Policy "Admins can manage waste entities" remains active