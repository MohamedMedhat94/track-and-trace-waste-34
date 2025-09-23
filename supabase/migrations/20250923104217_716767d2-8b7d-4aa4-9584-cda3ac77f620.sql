-- Enable realtime for shipments table
ALTER TABLE public.shipments REPLICA IDENTITY FULL;

-- Add shipments table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;

-- Enable realtime for shipment_notifications table
ALTER TABLE public.shipment_notifications REPLICA IDENTITY FULL;

-- Add shipment_notifications table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_notifications;