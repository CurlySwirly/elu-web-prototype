/*
  # Add Verification, Chat, Cancellation, and Review Systems

  ## New Tables
  
  1. `qualification_documents`
    - `id` (uuid, primary key)
    - `expert_profile_id` (uuid, foreign key to expert_profiles)
    - `document_type` (text) - e.g., "degree", "certificate", "license"
    - `file_path` (text) - Supabase Storage path
    - `file_name` (text)
    - `uploaded_at` (timestamptz)
    - `status` (text) - pending, approved, rejected
    
  2. `chat_threads`
    - `id` (uuid, primary key)
    - `appointment_id` (uuid, foreign key to appointments)
    - `client_id` (uuid, foreign key to profiles)
    - `expert_id` (uuid, foreign key to expert_profiles)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    
  3. `chat_messages`
    - `id` (uuid, primary key)
    - `thread_id` (uuid, foreign key to chat_threads)
    - `sender_id` (uuid, foreign key to profiles)
    - `message` (text)
    - `is_read` (boolean)
    - `created_at` (timestamptz)
    
  4. `reviews`
    - `id` (uuid, primary key)
    - `appointment_id` (uuid, foreign key to appointments)
    - `expert_profile_id` (uuid, foreign key to expert_profiles)
    - `client_id` (uuid, foreign key to profiles)
    - `rating` (integer) - 1-5
    - `title` (text)
    - `review_text` (text)
    - `helpful_count` (integer)
    - `created_at` (timestamptz)
    
  5. `cancellations`
    - `id` (uuid, primary key)
    - `booking_type` (text) - appointment or room_booking
    - `booking_id` (uuid)
    - `cancelled_by` (uuid, foreign key to profiles)
    - `reason` (text)
    - `refund_amount` (numeric)
    - `cancelled_at` (timestamptz)

  ## Schema Updates
  
  - Add `verification_status` to expert_profiles (pending, verified, rejected)
  - Add `verification_notes` to expert_profiles
  - Add `verified_at` to expert_profiles
  - Add `verified_by` to expert_profiles (admin user reference)
  - Add `cancellation_policy` to expert_offers
  - Add `can_be_cancelled` to appointments and room_bookings
  - Add `cancelled_at` to appointments and room_bookings

  ## Security
  - Enable RLS on all new tables
  - Add appropriate policies for each role
*/

-- Add verification fields to expert_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expert_profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE expert_profiles 
    ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expert_profiles' AND column_name = 'verification_notes'
  ) THEN
    ALTER TABLE expert_profiles ADD COLUMN verification_notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expert_profiles' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE expert_profiles ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expert_profiles' AND column_name = 'verified_by'
  ) THEN
    ALTER TABLE expert_profiles ADD COLUMN verified_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Add cancellation fields to appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'can_be_cancelled'
  ) THEN
    ALTER TABLE appointments ADD COLUMN can_be_cancelled boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;

-- Add cancellation fields to room_bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'room_bookings' AND column_name = 'can_be_cancelled'
  ) THEN
    ALTER TABLE room_bookings ADD COLUMN can_be_cancelled boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'room_bookings' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE room_bookings ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;

-- Create qualification_documents table
CREATE TABLE IF NOT EXISTS qualification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_profile_id uuid REFERENCES expert_profiles(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id)
);

ALTER TABLE qualification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can view own documents"
  ON qualification_documents FOR SELECT
  TO authenticated
  USING (
    expert_profile_id IN (
      SELECT id FROM expert_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Experts can insert own documents"
  ON qualification_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    expert_profile_id IN (
      SELECT id FROM expert_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all documents"
  ON qualification_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update documents"
  ON qualification_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES profiles(id) NOT NULL,
  expert_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view threads"
  ON chat_threads FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid() OR
    expert_id IN (
      SELECT id FROM expert_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create threads"
  ON chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    thread_id IN (
      SELECT id FROM chat_threads 
      WHERE client_id = auth.uid() OR expert_id IN (
        SELECT id FROM expert_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Thread participants can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    thread_id IN (
      SELECT id FROM chat_threads 
      WHERE client_id = auth.uid() OR expert_id IN (
        SELECT id FROM expert_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Sender can update own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  expert_profile_id uuid REFERENCES expert_profiles(id) NOT NULL,
  client_id uuid REFERENCES profiles(id) NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  review_text text NOT NULL,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(appointment_id, client_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clients can create reviews for their appointments"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid() AND
    appointment_id IN (
      SELECT id FROM appointments WHERE client_id = auth.uid() AND status = 'completed'
    )
  );

CREATE POLICY "Clients can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid());

-- Create cancellations table
CREATE TABLE IF NOT EXISTS cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type text NOT NULL CHECK (booking_type IN ('appointment', 'room_booking')),
  booking_id uuid NOT NULL,
  cancelled_by uuid REFERENCES profiles(id) NOT NULL,
  reason text,
  refund_amount numeric(10,2) DEFAULT 0,
  refund_eligible boolean DEFAULT false,
  cancelled_at timestamptz DEFAULT now()
);

ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cancellations"
  ON cancellations FOR SELECT
  TO authenticated
  USING (cancelled_by = auth.uid());

CREATE POLICY "Users can create cancellations"
  ON cancellations FOR INSERT
  TO authenticated
  WITH CHECK (cancelled_by = auth.uid());

CREATE POLICY "Admins can view all cancellations"
  ON cancellations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qualification_documents_expert ON qualification_documents(expert_profile_id);
CREATE INDEX IF NOT EXISTS idx_qualification_documents_status ON qualification_documents(status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_appointment ON chat_threads(appointment_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_client ON chat_threads(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_expert ON chat_threads(expert_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_expert ON reviews(expert_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment ON reviews(appointment_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_booking ON cancellations(booking_id);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_verification_status ON expert_profiles(verification_status);
