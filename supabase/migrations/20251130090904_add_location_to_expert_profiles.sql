/*
  # Add Location to Expert Profiles

  ## Changes
  - Add `city` column to `expert_profiles` table
  - Add `country` column to `expert_profiles` table (defaults to 'Deutschland')
  
  ## Purpose
  Allow experts to specify their location for display in profile cards
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expert_profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE expert_profiles ADD COLUMN city text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expert_profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE expert_profiles ADD COLUMN country text DEFAULT 'Deutschland';
  END IF;
END $$;
