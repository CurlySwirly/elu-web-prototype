/*
  # Add Availability Status to Expert Profiles

  ## Changes
  - Add `availability_status` column to `expert_profiles` table
    - Possible values: 'available', 'busy', 'unavailable'
    - Defaults to 'available'
  
  ## Purpose
  Enable clients to filter experts by their current availability status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expert_profiles' AND column_name = 'availability_status'
  ) THEN
    ALTER TABLE expert_profiles ADD COLUMN availability_status text DEFAULT 'available';
  END IF;
END $$;