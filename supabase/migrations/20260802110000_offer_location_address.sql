-- Per-offer location for in-person sessions
ALTER TABLE expert_offers
  ADD COLUMN IF NOT EXISTS location_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_postal_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_city text DEFAULT '';
