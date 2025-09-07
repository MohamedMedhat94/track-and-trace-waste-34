-- Add fields for manual driver entry in shipments table
ALTER TABLE public.shipments 
ADD COLUMN manual_driver_name TEXT,
ADD COLUMN manual_vehicle_number TEXT,
ADD COLUMN driver_entry_type TEXT DEFAULT 'registered' CHECK (driver_entry_type IN ('registered', 'manual'));