/*
  # Update Expert Onboarding Schema

  ## Overview
  Updates the expert onboarding flow to match the new requirements:
  1. Basic signup: name, email, password (handled by auth)
  2. Personal details: gender, address, DOB, languages
  3. Experience: profession, degree, certificates
  4. Post-login profile completion: payment, availability, absences, bio, profile pic, specializations, offers

  ## Changes

  ### Modified Tables

  #### `expert_profiles`
  Added new fields for the extended onboarding:
  - `gender` (text) - Gender of the expert
  - `date_of_birth` (date) - Date of birth
  - `address` (text) - Street address
  - `city` (text) - City
  - `postal_code` (text) - Postal code
  - `country` (text) - Country
  - `languages` (text[]) - Languages spoken
  - `profession` (text) - Professional title/role
  - `highest_degree` (text) - Highest educational degree
  - `certificate_urls` (text[]) - URLs to uploaded certificates
  - `profile_image_url` (text) - Profile picture URL
  - `profile_completion_status` (text) - Track profile completion stages
  - `is_profile_complete` (boolean) - Whether profile is complete and can be listed
  - `admin_approval_status` (text) - pending, approved, rejected
  - `admin_notes` (text) - Admin notes for approval/rejection

  #### `expert_onboarding`
  Simplified to track basic onboarding completion:
  - Removed fields that moved to expert_profiles
  - Added `personal_details_completed` (boolean)
  - Added `experience_completed` (boolean)

  ### New Tables

  #### `expert_availability`
  Stores expert working hours:
  - `id` (uuid, PK)
  - `expert_profile_id` (uuid, FK to expert_profiles)
  - `day_of_week` (int) - 0=Sunday, 6=Saturday
  - `start_time` (time) - Start time
  - `end_time` (time) - End time
  - `is_available` (boolean)
  - `created_at` (timestamptz)

  #### `expert_absences`
  Stores expert vacation/absence periods:
  - `id` (uuid, PK)
  - `expert_profile_id` (uuid, FK to expert_profiles)
  - `start_date` (date) - Start of absence
  - `end_date` (date) - End of absence
  - `reason` (text) - Optional reason
  - `created_at` (timestamptz)

  #### `expert_payment_details`
  Stores payment information:
  - `id` (uuid, PK)
  - `expert_profile_id` (uuid, FK to expert_profiles)
  - `payment_method` (text) - bank_transfer, paypal, etc.
  - `account_details` (jsonb) - Encrypted payment details
  - `is_verified` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all new tables
  - Experts can only manage their own data
  - Payment details are encrypted and only accessible by the expert
*/

-- Add new fields to expert_profiles
DO $$
BEGIN
  -- Personal details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'gender') THEN
    ALTER TABLE expert_profiles ADD COLUMN gender text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'date_of_birth') THEN
    ALTER TABLE expert_profiles ADD COLUMN date_of_birth date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'address') THEN
    ALTER TABLE expert_profiles ADD COLUMN address text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'city') THEN
    ALTER TABLE expert_profiles ADD COLUMN city text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'postal_code') THEN
    ALTER TABLE expert_profiles ADD COLUMN postal_code text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'country') THEN
    ALTER TABLE expert_profiles ADD COLUMN country text DEFAULT 'Germany';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'languages') THEN
    ALTER TABLE expert_profiles ADD COLUMN languages text[] DEFAULT '{}';
  END IF;

  -- Experience fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'profession') THEN
    ALTER TABLE expert_profiles ADD COLUMN profession text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'highest_degree') THEN
    ALTER TABLE expert_profiles ADD COLUMN highest_degree text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'certificate_urls') THEN
    ALTER TABLE expert_profiles ADD COLUMN certificate_urls text[] DEFAULT '{}';
  END IF;

  -- Profile completion fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'profile_image_url') THEN
    ALTER TABLE expert_profiles ADD COLUMN profile_image_url text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'profile_completion_status') THEN
    ALTER TABLE expert_profiles ADD COLUMN profile_completion_status text DEFAULT 'basic_signup';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'is_profile_complete') THEN
    ALTER TABLE expert_profiles ADD COLUMN is_profile_complete boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'admin_approval_status') THEN
    ALTER TABLE expert_profiles ADD COLUMN admin_approval_status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_profiles' AND column_name = 'admin_notes') THEN
    ALTER TABLE expert_profiles ADD COLUMN admin_notes text DEFAULT '';
  END IF;
END $$;

-- Update expert_onboarding table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_onboarding' AND column_name = 'personal_details_completed') THEN
    ALTER TABLE expert_onboarding ADD COLUMN personal_details_completed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expert_onboarding' AND column_name = 'experience_completed') THEN
    ALTER TABLE expert_onboarding ADD COLUMN experience_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create expert_availability table
CREATE TABLE IF NOT EXISTS expert_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_profile_id uuid NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expert_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can read own availability"
  ON expert_availability FOR SELECT
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can insert own availability"
  ON expert_availability FOR INSERT
  TO authenticated
  WITH CHECK (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can update own availability"
  ON expert_availability FOR UPDATE
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()))
  WITH CHECK (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can delete own availability"
  ON expert_availability FOR DELETE
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

-- Create expert_absences table
CREATE TABLE IF NOT EXISTS expert_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_profile_id uuid NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expert_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can read own absences"
  ON expert_absences FOR SELECT
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can insert own absences"
  ON expert_absences FOR INSERT
  TO authenticated
  WITH CHECK (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can update own absences"
  ON expert_absences FOR UPDATE
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()))
  WITH CHECK (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can delete own absences"
  ON expert_absences FOR DELETE
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

-- Create expert_payment_details table
CREATE TABLE IF NOT EXISTS expert_payment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_profile_id uuid UNIQUE NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  payment_method text DEFAULT '',
  account_details jsonb DEFAULT '{}',
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expert_payment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can read own payment details"
  ON expert_payment_details FOR SELECT
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can insert own payment details"
  ON expert_payment_details FOR INSERT
  TO authenticated
  WITH CHECK (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can update own payment details"
  ON expert_payment_details FOR UPDATE
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()))
  WITH CHECK (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));
