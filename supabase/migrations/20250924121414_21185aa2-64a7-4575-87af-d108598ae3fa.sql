-- Enable realtime for companies, drivers, and waste_types tables
-- First set replica identity to full for complete row data during updates
ALTER TABLE companies REPLICA IDENTITY FULL;
ALTER TABLE drivers REPLICA IDENTITY FULL;
ALTER TABLE waste_types REPLICA IDENTITY FULL;

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE waste_types;