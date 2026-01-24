-- Add destination columns to inventory_movements
ALTER TABLE public.inventory_movements
ADD COLUMN destination_type TEXT CHECK (destination_type IN ('employee', 'equipment', 'area')),
ADD COLUMN destination_id UUID,
ADD COLUMN destination_name TEXT;