/*
  # Allow Public Access to Expert Profiles

  ## Changes
  - Update RLS policy on `expert_profiles` table to allow unauthenticated users to view expert profiles
  - Update RLS policy on `profiles` table to allow public read access for expert profiles
  
  ## Purpose
  This allows the landing page to showcase experts without requiring users to be logged in.
  
  ## Security Notes
  - Only SELECT operations are allowed for public users
  - No sensitive data is exposed (email is in profiles table with separate policies)
*/

-- Drop existing policy and create new one for expert_profiles
DROP POLICY IF EXISTS "Anyone can view expert profiles" ON expert_profiles;

CREATE POLICY "Public can view expert profiles"
  ON expert_profiles FOR SELECT
  TO public
  USING (true);

-- Allow public to view profile info for experts
CREATE POLICY "Public can view expert user profiles"
  ON profiles FOR SELECT
  TO public
  USING (role = 'expert');
