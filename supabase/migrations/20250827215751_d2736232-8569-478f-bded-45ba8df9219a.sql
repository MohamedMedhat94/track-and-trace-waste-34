-- Fix RLS policies that might cause infinite recursion
-- First, ensure we have the required function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Update companies RLS policies to allow company users to view basic company info
DROP POLICY IF EXISTS "Companies can view themselves" ON public.companies;
CREATE POLICY "Companies can view themselves" ON public.companies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  )
);

-- Add policy for company selection (needed for dropdowns)
DROP POLICY IF EXISTS "Companies visible for selection" ON public.companies;
CREATE POLICY "Companies visible for selection" ON public.companies
FOR SELECT USING (
  is_active = true AND status = 'active'
);

-- Update shipments policies to be more specific
DROP POLICY IF EXISTS "Company users can view their company shipments" ON public.shipments;
CREATE POLICY "Company users can view their company shipments" ON public.shipments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      (p.company_id = shipments.generator_company_id) OR
      (p.company_id = shipments.transporter_company_id) OR
      (p.company_id = shipments.recycler_company_id)
    )
  )
);

-- Add function to get shipments by company type
CREATE OR REPLACE FUNCTION public.get_company_shipments(company_type text)
RETURNS TABLE(
  id uuid,
  shipment_number text,
  status text,
  quantity numeric,
  created_at timestamp with time zone,
  waste_type_name text,
  generator_company_name text,
  transporter_company_name text,
  recycler_company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_company_id uuid;
BEGIN
  -- Get current user's company ID
  SELECT company_id INTO current_company_id
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF current_company_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.shipment_number,
    s.status,
    s.quantity,
    s.created_at,
    wt.name as waste_type_name,
    gc.name as generator_company_name,
    tc.name as transporter_company_name,
    rc.name as recycler_company_name
  FROM shipments s
  LEFT JOIN waste_types wt ON s.waste_type_id = wt.id
  LEFT JOIN companies gc ON s.generator_company_id = gc.id
  LEFT JOIN companies tc ON s.transporter_company_id = tc.id
  LEFT JOIN companies rc ON s.recycler_company_id = rc.id
  WHERE 
    CASE 
      WHEN company_type = 'generator' THEN s.generator_company_id = current_company_id
      WHEN company_type = 'transporter' THEN s.transporter_company_id = current_company_id
      WHEN company_type = 'recycler' THEN s.recycler_company_id = current_company_id
      ELSE false
    END
  ORDER BY s.created_at DESC;
END;
$function$;

-- Add function for admin to get company statistics
CREATE OR REPLACE FUNCTION public.get_companies_stats()
RETURNS TABLE(
  company_id uuid,
  company_name text,
  company_type text,
  total_shipments bigint,
  active_shipments bigint,
  completed_shipments bigint,
  total_waste_processed numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can access this
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can view company statistics';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id as company_id,
    c.name as company_name,
    c.type as company_type,
    COUNT(DISTINCT s.id) as total_shipments,
    COUNT(DISTINCT CASE WHEN s.status IN ('pending', 'in_transit', 'processing') THEN s.id END) as active_shipments,
    COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_shipments,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.quantity ELSE 0 END), 0) as total_waste_processed
  FROM companies c
  LEFT JOIN shipments s ON (
    s.generator_company_id = c.id OR 
    s.transporter_company_id = c.id OR 
    s.recycler_company_id = c.id
  )
  WHERE c.is_active = true
  GROUP BY c.id, c.name, c.type
  ORDER BY total_shipments DESC;
END;
$function$;