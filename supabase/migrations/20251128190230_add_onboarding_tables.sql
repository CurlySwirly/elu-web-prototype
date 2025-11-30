/*
  # Add Onboarding Data Tables

  ## Overview
  Adds tables to store role-specific onboarding data for clients, experts, and providers.

  ## New Tables

  ### `client_preferences`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - The client user
  - `goals` (text[]) - Health/wellness goals (Rückenschmerzen, Stress, Fitness, etc.)
  - `format_preferences` (text[]) - Online, Vor Ort, Hybrid
  - `location_city` (text) - City for in-person matching
  - `location_postal_code` (text) - Postal code for location matching
  - `languages` (text[]) - Preferred languages
  - `training_level` (text) - Beginner, Intermediate, Advanced
  - `additional_notes` (text) - Personal preferences/wishes
  - `onboarding_completed` (boolean) - Whether onboarding is finished
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `expert_onboarding`
  - `id` (uuid, primary key)
  - `expert_profile_id` (uuid, FK to expert_profiles)
  - `main_title` (text) - Professional title (Physiotherapeut:in, Trainer:in, etc.)
  - `categories` (text[]) - Training, Coaching, Ernährung, Massage, Physio
  - `qualifications` (text[]) - Degrees, certificates, training
  - `focus_areas` (text[]) - Rückenschmerzen, Stress, Kraftaufbau, etc.
  - `languages` (text[]) - Languages offered
  - `session_types` (text[]) - Individual, Group
  - `profile_visible` (boolean) - Public profile visibility
  - `calendar_setup_completed` (boolean) - Availability calendar configured
  - `onboarding_completed` (boolean) - Whether onboarding is finished
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `provider_onboarding`
  - `id` (uuid, primary key)
  - `provider_profile_id` (uuid, FK to provider_profiles)
  - `room_type` (text) - Studio, Praxis, PT-Gym, Massageraum, Coachingraum
  - `room_size_sqm` (int) - Room size in square meters
  - `equipment` (text[]) - Available equipment/amenities
  - `usage_rules` (text[]) - Rules for using the space
  - `max_persons` (int) - Maximum capacity
  - `access_method` (text) - Schlüsselbox, Nuki/Code, Persönliche Übergabe
  - `opening_hours` (jsonb) - Opening hours structure
  - `special_rules` (text) - Additional rules/notes
  - `insurance_confirmed` (boolean) - Room insurance confirmed
  - `terms_accepted` (boolean) - Terms and conditions accepted
  - `onboarding_completed` (boolean) - Whether onboarding is finished
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only read/write their own onboarding data
  - Clients can read their preferences
  - Experts can manage their onboarding data
  - Providers can manage their onboarding data
*/

-- Create client_preferences table
CREATE TABLE IF NOT EXISTS client_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goals text[] DEFAULT '{}',
  format_preferences text[] DEFAULT '{}',
  location_city text DEFAULT '',
  location_postal_code text DEFAULT '',
  languages text[] DEFAULT '{}',
  training_level text DEFAULT '',
  additional_notes text DEFAULT '',
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read own preferences"
  ON client_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Clients can update own preferences"
  ON client_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Clients can insert own preferences"
  ON client_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create expert_onboarding table
CREATE TABLE IF NOT EXISTS expert_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_profile_id uuid UNIQUE NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  main_title text DEFAULT '',
  categories text[] DEFAULT '{}',
  qualifications text[] DEFAULT '{}',
  focus_areas text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  session_types text[] DEFAULT '{}',
  profile_visible boolean DEFAULT true,
  calendar_setup_completed boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expert_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can read own onboarding"
  ON expert_onboarding FOR SELECT
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can update own onboarding"
  ON expert_onboarding FOR UPDATE
  TO authenticated
  USING (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()))
  WITH CHECK (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can insert own onboarding"
  ON expert_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (expert_profile_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid()));

-- Create provider_onboarding table
CREATE TABLE IF NOT EXISTS provider_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_profile_id uuid UNIQUE NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  room_type text DEFAULT '',
  room_size_sqm int DEFAULT 0,
  equipment text[] DEFAULT '{}',
  usage_rules text[] DEFAULT '{}',
  max_persons int DEFAULT 1,
  access_method text DEFAULT '',
  opening_hours jsonb DEFAULT '{}',
  special_rules text DEFAULT '',
  insurance_confirmed boolean DEFAULT false,
  terms_accepted boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE provider_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can read own onboarding"
  ON provider_onboarding FOR SELECT
  TO authenticated
  USING (provider_profile_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Providers can update own onboarding"
  ON provider_onboarding FOR UPDATE
  TO authenticated
  USING (provider_profile_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()))
  WITH CHECK (provider_profile_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Providers can insert own onboarding"
  ON provider_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (provider_profile_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid()));