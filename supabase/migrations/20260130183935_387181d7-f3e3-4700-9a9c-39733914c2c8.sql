-- Create shipment messages table for in-platform chat
CREATE TABLE public.shipment_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  sender_company_id UUID,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipment_messages ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_shipment_messages_shipment_id ON public.shipment_messages(shipment_id);
CREATE INDEX idx_shipment_messages_sender_id ON public.shipment_messages(sender_id);
CREATE INDEX idx_shipment_messages_created_at ON public.shipment_messages(created_at DESC);

-- RLS Policies

-- Admins can do everything
CREATE POLICY "Admins can manage all messages"
ON public.shipment_messages
FOR ALL
USING (is_admin());

-- Users can view messages for shipments they're involved in
CREATE POLICY "Users can view messages for their shipments"
ON public.shipment_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shipments s
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE s.id = shipment_messages.shipment_id
    AND (
      p.role = 'admin'
      OR p.company_id = s.generator_company_id
      OR p.company_id = s.transporter_company_id
      OR p.company_id = s.recycler_company_id
      OR s.driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid())
    )
  )
);

-- Users can insert messages for shipments they're involved in
CREATE POLICY "Users can send messages for their shipments"
ON public.shipment_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM shipments s
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE s.id = shipment_messages.shipment_id
    AND (
      p.role = 'admin'
      OR p.company_id = s.generator_company_id
      OR p.company_id = s.transporter_company_id
      OR p.company_id = s.recycler_company_id
      OR s.driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid())
    )
  )
);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update messages"
ON public.shipment_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shipments s
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE s.id = shipment_messages.shipment_id
    AND (
      p.role = 'admin'
      OR p.company_id = s.generator_company_id
      OR p.company_id = s.transporter_company_id
      OR p.company_id = s.recycler_company_id
    )
  )
);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_messages;