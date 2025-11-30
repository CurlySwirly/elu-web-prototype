/*
  # Provider Onboarding Checklist System

  ## Overview
  Adds comprehensive onboarding checklist system for room providers including:
  - Profile completion tracking
  - Stripe Connect integration status
  - Room setup completion
  - Admin approval workflow
  - Enhanced room details with photos and rules

  ## Changes to Existing Tables

  ### `provider_profiles`
  Adds:
  - `approval_status` (text) - pending, approved, rejected
  - `approved_by` (uuid, FK to profiles) - Admin who approved
  - `approved_at` (timestamptz) - Approval timestamp
  - `stripe_account_id` (text) - Stripe Connect account ID
  - `stripe_onboarding_completed` (boolean) - Stripe setup complete
  - `company_name` (text) - Official company/person name
  - `tax_id` (text) - Tax identification number
  - `phone` (text) - Contact phone number
  - `billing_address` (text) - Billing address
  - `billing_city` (text) - Billing city
  - `billing_postal_code` (text) - Billing postal code
  - `profile_completed` (boolean) - Stammdaten complete
  - `has_active_rooms` (boolean) - At least one room created
  - `updated_at` (timestamptz) - Last update timestamp

  ### `provider_onboarding`
  Adds:
  - `stripe_connected` (boolean) - Stripe account connected
  - `rooms_created` (boolean) - At least one room created
  - `ready_for_approval` (boolean) - All checklist items complete

  ### `rooms`
  Adds:
  - `address` (text) - Room address (can differ from provider)
  - `city` (text) - Room city
  - `postal_code` (text) - Room postal code
  - `usage_rules` (text[]) - Specific usage rules
  - `price_per_hour` (decimal) - Hourly rate
  - `photos` (jsonb) - Array of photo objects with url and order
  - `is_approved` (boolean) - Admin approved
  - `approval_notes` (text) - Admin notes
  - `updated_at` (timestamptz)

  ## New Tables

  ### `room_availability`
  - `id` (uuid, primary key)
  - `room_id` (uuid, FK to rooms)
  - `day_of_week` (int) - 0=Sunday, 1=Monday, etc.
  - `start_time` (time) - Start time for availability
  - `end_time` (time) - End time for availability
  - `is_available` (boolean) - Active/inactive
  - `created_at` (timestamptz)

  ### `room_blocked_dates`
  - `id` (uuid, primary key)
  - `room_id` (uuid, FK to rooms)
  - `blocked_date` (date) - Specific date blocked (vacation, etc.)
  - `reason` (text) - Why it's blocked
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Providers can only manage their own data
  - Admins can approve/reject providers
  - Only approved rooms are visible in public search
*/

-- Add new columns to provider_profiles
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_account_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_postal_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_active_rooms boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add new columns to provider_onboarding
ALTER TABLE provider_onboarding
  ADD COLUMN IF NOT EXISTS stripe_connected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rooms_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ready_for_approval boolean DEFAULT false;

-- Add new columns to rooms
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS postal_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS usage_rules text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_per_hour decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create room_availability table
CREATE TABLE IF NOT EXISTS room_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, day_of_week, start_time)
);

ALTER TABLE room_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own room availability"
  ON room_availability FOR ALL
  TO authenticated
  USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN provider_profiles pp ON r.provider_id = pp.id
      WHERE pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view room availability"
  ON room_availability FOR SELECT
  TO authenticated
  USING (true);

-- Create room_blocked_dates table
CREATE TABLE IF NOT EXISTS room_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, blocked_date)
);

ALTER TABLE room_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own room blocked dates"
  ON room_blocked_dates FOR ALL
  TO authenticated
  USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN provider_profiles pp ON r.provider_id = pp.id
      WHERE pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view room blocked dates"
  ON room_blocked_dates FOR SELECT
  TO authenticated
  USING (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_provider_profiles_approval_status ON provider_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_rooms_is_approved ON rooms(is_approved);
CREATE INDEX IF NOT EXISTS idx_room_availability_room_id ON room_availability(room_id);
CREATE INDEX IF NOT EXISTS idx_room_blocked_dates_room_id ON room_blocked_dates(room_id);

-- Update RLS policies for rooms to only show approved rooms in public view
DROP POLICY IF EXISTS "Anyone can view available rooms" ON rooms;

CREATE POLICY "Anyone can view approved rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    is_approved = true
    AND provider_id IN (
      SELECT id FROM provider_profiles WHERE approval_status = 'approved'
    )
  );

-- Providers can still view their own rooms regardless of approval status
CREATE POLICY "Providers can view own rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM provider_profiles WHERE user_id = auth.uid()
    )
  );

-- Add policy for admins to view all providers
CREATE POLICY "Admins can view all provider profiles"
  ON provider_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add policy for admins to update provider approval status
CREATE POLICY "Admins can update provider approval"
  ON provider_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add policy for admins to approve rooms
CREATE POLICY "Admins can update room approval"
  ON rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to check if provider checklist is complete
CREATE OR REPLACE FUNCTION check_provider_checklist_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_completed = true
     AND NEW.stripe_onboarding_completed = true
     AND NEW.has_active_rooms = true THEN

    UPDATE provider_onboarding
    SET ready_for_approval = true,
        updated_at = now()
    WHERE provider_profile_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update checklist completion
DROP TRIGGER IF EXISTS trigger_check_provider_checklist ON provider_profiles;
CREATE TRIGGER trigger_check_provider_checklist
  AFTER UPDATE ON provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_provider_checklist_complete();

-- Function to update has_active_rooms when rooms are created
CREATE OR REPLACE FUNCTION update_provider_has_rooms()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE provider_profiles
  SET has_active_rooms = true,
      updated_at = now()
  WHERE id = NEW.provider_id;

  UPDATE provider_onboarding
  SET rooms_created = true,
      updated_at = now()
  WHERE provider_profile_id = NEW.provider_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update when rooms are created
DROP TRIGGER IF EXISTS trigger_update_provider_has_rooms ON rooms;
CREATE TRIGGER trigger_update_provider_has_rooms
  AFTER INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_has_rooms();