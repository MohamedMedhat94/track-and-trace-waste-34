-- Add explicit policy to block anonymous access to drivers table
-- This ensures that only authenticated users with proper authorization can access driver data

-- First, let's add a restrictive policy that blocks anonymous access
CREATE POLICY "Block anonymous access to drivers"
ON public.drivers
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Add a comment explaining the security measure
COMMENT ON POLICY "Block anonymous access to drivers" ON public.drivers IS 
'Security policy: Blocks all anonymous access to the drivers table. Only authenticated users can potentially access driver data, and they must also satisfy permissive policies.';