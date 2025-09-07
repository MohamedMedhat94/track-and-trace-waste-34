-- Update INSERT policy on shipments to include recycler role
DROP POLICY IF EXISTS "Authorized users can create shipments" ON public.shipments;

CREATE POLICY "Authorized users can create shipments"
ON public.shipments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin'::text, 'transporter'::text, 'generator'::text, 'recycler'::text])
  )
);
