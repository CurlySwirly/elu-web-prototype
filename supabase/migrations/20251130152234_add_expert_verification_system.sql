/*
  # Expert Verification and 5-Step Checklist System

  ## Overview
  Implements a comprehensive 3-status verification system for experts:
  - not_verified_incomplete (gray badge)
  - not_verified_pending_review (yellow badge)
  - verified (green badge)

  With 5 mandatory checklist steps:
  1. Stammdaten vervollständigen
  2. Qualifikationen hochladen
  3. Angebot(e) anlegen
  4. Verfügbarkeit anlegen
  5. Stripe Connect verknüpfen

  ## Changes to Existing Tables

  ### `expert_profiles`
  Adds verification tracking fields:
  - `verification_status` (text) - not_verified_incomplete, not_verified_pending_review, verified
  - `verified_at` (timestamptz) - When admin verified
  - `verified_by` (uuid, FK to profiles) - Admin who verified
  - `checklist_stammdaten_completed` (boolean) - Step 1 complete
  - `checklist_qualifications_uploaded` (boolean) - Step 2 complete
  - `checklist_offers_created` (boolean) - Step 3 complete
  - `checklist_availability_set` (boolean) - Step 4 complete
  - `checklist_stripe_connected` (boolean) - Step 5 complete
  - `qualification_verified` (boolean) - Admin approved qualifications
  - `stripe_account_id` (text) - Stripe Connect account
  - `stripe_onboarding_completed` (boolean) - Stripe setup done

  ### `expert_onboarding`
  Adds:
  - `checklist_complete` (boolean) - All 5 steps done

  ## New Tables

  ### `expert_qualifications`
  Stores uploaded qualification documents:
  - `id` (uuid, primary key)
  - `expert_profile_id` (uuid, FK to expert_profiles)
  - `document_type` (text) - Diploma, Certificate, License, etc.
  - `document_name` (text) - Original filename
  - `document_url` (text) - Storage URL
  - `issued_by` (text) - Issuing institution
  - `issued_date` (date) - When issued
  - `verification_status` (text) - pending, approved, rejected
  - `verified_by` (uuid, FK to profiles) - Admin who verified
  - `verified_at` (timestamptz) - When verified
  - `admin_notes` (text) - Admin comments
  - `created_at` (timestamptz)

  ## Status Logic

  ### not_verified_incomplete
  - At least one checklist item NOT complete
  - Profile invisible
  - No matching
  - No bookings
  - No room access

  ### not_verified_pending_review
  - ALL 5 checklist items complete
  - At least one qualification uploaded
  - Waiting for admin verification
  - Profile still invisible

  ### verified
  - Admin manually approved at least one qualification
  - qualification_verified = true
  - verification_status = 'verified'
  - Profile visible
  - Matching enabled
  - Bookings enabled
  - Room access enabled
  - Stripe payouts active

  ## Automated Triggers

  ### Auto-update checklist flags:
  - `checklist_offers_created` when expert_offers inserted
  - `checklist_availability_set` when expert_availability inserted
  - `checklist_qualifications_uploaded` when expert_qualifications inserted

  ### Auto-update verification_status:
  - When all 5 checklist items = true AND qualification uploaded → 'not_verified_pending_review'
  - When admin approves qualification → 'verified'

  ## Security
  - RLS policies updated to respect verification_status
  - Only verified experts visible in public search
  - Only verified experts can book rooms
  - Admins can view all experts and verify qualifications
*/

-- Add verification fields to expert_profiles
ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'not_verified_incomplete',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS checklist_stammdaten_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_qualifications_uploaded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_offers_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_availability_set boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_stripe_connected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS qualification_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_account_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean DEFAULT false;

-- Add checklist_complete to expert_onboarding
ALTER TABLE expert_onboarding
  ADD COLUMN IF NOT EXISTS checklist_complete boolean DEFAULT false;

-- Create expert_qualifications table
CREATE TABLE IF NOT EXISTS expert_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_profile_id uuid NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT '',
  document_name text NOT NULL DEFAULT '',
  document_url text NOT NULL DEFAULT '',
  issued_by text DEFAULT '',
  issued_date date,
  verification_status text DEFAULT 'pending',
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,
  admin_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expert_qualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can read own qualifications"
  ON expert_qualifications FOR SELECT
  TO authenticated
  USING (
    expert_profile_id IN (
      SELECT id FROM expert_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Experts can insert own qualifications"
  ON expert_qualifications FOR INSERT
  TO authenticated
  WITH CHECK (
    expert_profile_id IN (
      SELECT id FROM expert_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Experts can update own qualifications"
  ON expert_qualifications FOR UPDATE
  TO authenticated
  USING (
    expert_profile_id IN (
      SELECT id FROM expert_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    expert_profile_id IN (
      SELECT id FROM expert_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all qualifications"
  ON expert_qualifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update qualifications"
  ON expert_qualifications FOR UPDATE
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

-- Trigger: Auto-set checklist_offers_created when offer created
CREATE OR REPLACE FUNCTION update_expert_offers_checklist()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE expert_profiles
  SET checklist_offers_created = true
  WHERE id = NEW.expert_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_expert_offers_checklist ON expert_offers;
CREATE TRIGGER trigger_update_expert_offers_checklist
  AFTER INSERT ON expert_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_offers_checklist();

-- Trigger: Auto-set checklist_availability_set when availability created
CREATE OR REPLACE FUNCTION update_expert_availability_checklist()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE expert_profiles
  SET checklist_availability_set = true
  WHERE id = NEW.expert_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_expert_availability_checklist ON expert_availability;
CREATE TRIGGER trigger_update_expert_availability_checklist
  AFTER INSERT ON expert_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_availability_checklist();

-- Trigger: Auto-set checklist_qualifications_uploaded when qualification uploaded
CREATE OR REPLACE FUNCTION update_expert_qualifications_checklist()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE expert_profiles
  SET checklist_qualifications_uploaded = true
  WHERE id = NEW.expert_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_expert_qualifications_checklist ON expert_qualifications;
CREATE TRIGGER trigger_update_expert_qualifications_checklist
  AFTER INSERT ON expert_qualifications
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_qualifications_checklist();

-- Trigger: Auto-update verification_status based on checklist completion
CREATE OR REPLACE FUNCTION update_expert_verification_status()
RETURNS TRIGGER AS $$
DECLARE
  all_complete boolean;
  has_qualification boolean;
BEGIN
  all_complete := NEW.checklist_stammdaten_completed = true
    AND NEW.checklist_qualifications_uploaded = true
    AND NEW.checklist_offers_created = true
    AND NEW.checklist_availability_set = true
    AND NEW.checklist_stripe_connected = true;

  SELECT EXISTS (
    SELECT 1 FROM expert_qualifications
    WHERE expert_profile_id = NEW.id
  ) INTO has_qualification;

  IF all_complete AND has_qualification AND NEW.verification_status = 'not_verified_incomplete' THEN
    NEW.verification_status := 'not_verified_pending_review';
    
    UPDATE expert_onboarding
    SET checklist_complete = true,
        updated_at = now()
    WHERE expert_profile_id = NEW.id;
  END IF;

  IF NOT all_complete AND NEW.verification_status = 'not_verified_pending_review' THEN
    NEW.verification_status := 'not_verified_incomplete';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_expert_verification_status ON expert_profiles;
CREATE TRIGGER trigger_update_expert_verification_status
  BEFORE UPDATE ON expert_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_verification_status();

-- Trigger: When admin verifies qualification, set expert to verified
CREATE OR REPLACE FUNCTION verify_expert_on_qualification_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'approved' AND OLD.verification_status != 'approved' THEN
    UPDATE expert_profiles
    SET 
      verification_status = 'verified',
      qualification_verified = true,
      verified_at = now(),
      verified_by = NEW.verified_by,
      is_verified = true
    WHERE id = NEW.expert_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_verify_expert_on_qualification_approval ON expert_qualifications;
CREATE TRIGGER trigger_verify_expert_on_qualification_approval
  AFTER UPDATE ON expert_qualifications
  FOR EACH ROW
  WHEN (NEW.verification_status = 'approved')
  EXECUTE FUNCTION verify_expert_on_qualification_approval();

-- Update public visibility policy for expert_profiles
DROP POLICY IF EXISTS "Anyone can view verified expert profiles" ON expert_profiles;
DROP POLICY IF EXISTS "Anyone can view expert profiles" ON expert_profiles;

CREATE POLICY "Public can view verified experts only"
  ON expert_profiles FOR SELECT
  TO authenticated
  USING (verification_status = 'verified');

CREATE POLICY "Experts can view own profile regardless of status"
  ON expert_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all expert profiles"
  ON expert_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_expert_profiles_verification_status ON expert_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_expert_qualifications_verification_status ON expert_qualifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_expert_qualifications_expert_id ON expert_qualifications(expert_profile_id);