/*
  # Booking Flow System with Payment and Cancellation

  ## Overview
  Implements complete booking flow for:
  - Session bookings (Client → Expert)
  - Room bookings (Expert → Room Provider)
  - Payment tracking with Stripe
  - 24-hour cancellation policy
  - Separate refund logic for each booking type

  ## Changes to Existing Tables

  ### `appointments` (Sessions)
  Enhanced with:
  - `room_booking_id` (uuid, FK to room_bookings) - Optional room reference
  - `payment_status` (text) - unpaid, paid, refunded
  - `payment_intent_id` (text) - Stripe Payment Intent ID
  - `amount_paid` (decimal) - Actual amount paid
  - `cancelled_at` (timestamptz) - When cancelled
  - `cancelled_by` (uuid, FK to profiles) - Who cancelled
  - `cancellation_reason` (text) - Optional reason
  - `refund_amount` (decimal) - Amount refunded
  - `refund_processed_at` (timestamptz) - When refund processed

  Status values:
  - requested - Client paid, waiting for expert confirmation
  - confirmed - Expert confirmed, session scheduled
  - cancelled_by_client - Client cancelled
  - cancelled_by_expert - Expert cancelled (full refund)
  - completed - Session finished

  ### `room_bookings`
  Enhanced with:
  - `room_provider_id` (uuid, FK to provider_profiles) - For quick access
  - `payment_status` (text) - unpaid, paid, refunded
  - `payment_intent_id` (text) - Stripe Payment Intent ID
  - `amount_paid` (decimal) - Actual amount paid
  - `cancelled_at` (timestamptz) - When cancelled
  - `cancellation_reason` (text) - Optional reason
  - `refund_amount` (decimal) - Amount refunded
  - `refund_processed_at` (timestamptz) - When refund processed
  - `appointment_id` (uuid, FK to appointments) - Optional session reference

  Status values:
  - reserved - Reserved but not yet paid
  - paid - Payment received
  - cancelled_refunded - Cancelled within 24h, refunded
  - cancelled_no_refund - Cancelled after 24h, no refund
  - completed - Booking finished

  ## New Tables

  ### `booking_notifications`
  Tracks notifications for booking events:
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - Recipient
  - `booking_type` (text) - appointment or room_booking
  - `booking_id` (uuid) - ID of appointment or room_booking
  - `notification_type` (text) - booking_requested, confirmed, cancelled, etc.
  - `title` (text) - Notification title
  - `message` (text) - Notification message
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz)

  ### `refund_logs`
  Audit trail for all refunds:
  - `id` (uuid, primary key)
  - `booking_type` (text) - appointment or room_booking
  - `booking_id` (uuid) - ID of booking
  - `amount` (decimal) - Refund amount
  - `reason` (text) - Cancellation reason
  - `processed_by` (uuid, FK to profiles) - Who triggered refund
  - `stripe_refund_id` (text) - Stripe Refund ID
  - `status` (text) - pending, completed, failed
  - `created_at` (timestamptz)
  - `processed_at` (timestamptz)

  ## Cancellation Policy Logic

  ### Appointments (Sessions):
  - Client cancels ≤ 24h before: Full refund, expert gets nothing
  - Client cancels > 24h before: No refund, expert gets paid
  - Expert cancels anytime: Full refund to client

  ### Room Bookings:
  - Expert cancels ≤ 24h before: Full refund
  - Expert cancels > 24h before: No refund, provider keeps payment

  ## Security
  - RLS policies ensure users can only cancel their own bookings
  - Refund logs are audit-only (admin read-only)
  - Notifications are user-specific
*/

-- Add new fields to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS room_booking_id uuid REFERENCES room_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_intent_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS amount_paid decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS refund_amount decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_processed_at timestamptz;

-- Update appointment status to use new values
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('requested', 'confirmed', 'cancelled_by_client', 'cancelled_by_expert', 'completed'));

-- Add new fields to room_bookings
ALTER TABLE room_bookings
  ADD COLUMN IF NOT EXISTS room_provider_id uuid REFERENCES provider_profiles(id),
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_intent_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS amount_paid decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS refund_amount decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;

-- Update room_booking status to use new values
ALTER TABLE room_bookings
  DROP CONSTRAINT IF EXISTS room_bookings_status_check;

ALTER TABLE room_bookings
  ADD CONSTRAINT room_bookings_status_check
  CHECK (status IN ('reserved', 'paid', 'cancelled_refunded', 'cancelled_no_refund', 'completed'));

-- Create booking_notifications table
CREATE TABLE IF NOT EXISTS booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_type text NOT NULL CHECK (booking_type IN ('appointment', 'room_booking')),
  booking_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON booking_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON booking_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create refund_logs table
CREATE TABLE IF NOT EXISTS refund_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type text NOT NULL CHECK (booking_type IN ('appointment', 'room_booking')),
  booking_id uuid NOT NULL,
  amount decimal(10,2) NOT NULL,
  reason text DEFAULT '',
  processed_by uuid REFERENCES profiles(id),
  stripe_refund_id text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE refund_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all refund logs"
  ON refund_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function: Check if cancellation is within 24 hours
CREATE OR REPLACE FUNCTION is_within_cancellation_window(booking_start timestamptz)
RETURNS boolean AS $$
BEGIN
  RETURN now() <= (booking_start - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Cancel appointment by client
CREATE OR REPLACE FUNCTION cancel_appointment_by_client(
  p_appointment_id uuid,
  p_reason text DEFAULT ''
)
RETURNS jsonb AS $$
DECLARE
  v_appointment appointments;
  v_refund_amount decimal(10,2);
  v_within_window boolean;
BEGIN
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id
  AND client_id = auth.uid()
  AND status = 'confirmed';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Appointment not found or not cancellable'
    );
  END IF;

  v_within_window := is_within_cancellation_window(v_appointment.start_time);

  IF v_within_window THEN
    v_refund_amount := v_appointment.amount_paid;
  ELSE
    v_refund_amount := 0;
  END IF;

  UPDATE appointments
  SET
    status = 'cancelled_by_client',
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancellation_reason = p_reason,
    refund_amount = v_refund_amount,
    payment_status = CASE WHEN v_refund_amount > 0 THEN 'refunded' ELSE payment_status END
  WHERE id = p_appointment_id;

  IF v_refund_amount > 0 THEN
    INSERT INTO refund_logs (
      booking_type,
      booking_id,
      amount,
      reason,
      processed_by,
      status
    ) VALUES (
      'appointment',
      p_appointment_id,
      v_refund_amount,
      p_reason,
      auth.uid(),
      'pending'
    );
  END IF;

  INSERT INTO booking_notifications (
    user_id,
    booking_type,
    booking_id,
    notification_type,
    title,
    message
  ) VALUES (
    (SELECT user_id FROM expert_profiles WHERE id = v_appointment.expert_id),
    'appointment',
    p_appointment_id,
    'cancelled_by_client',
    'Termin storniert',
    CASE
      WHEN v_within_window THEN 'Client hat den Termin rechtzeitig storniert. Du erhältst keine Auszahlung.'
      ELSE 'Client hat den Termin kurzfristig storniert. Du erhältst die volle Auszahlung.'
    END
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'within_window', v_within_window
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cancel appointment by expert
CREATE OR REPLACE FUNCTION cancel_appointment_by_expert(
  p_appointment_id uuid,
  p_reason text DEFAULT ''
)
RETURNS jsonb AS $$
DECLARE
  v_appointment appointments;
  v_expert_profile_id uuid;
BEGIN
  SELECT id INTO v_expert_profile_id
  FROM expert_profiles
  WHERE user_id = auth.uid();

  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id
  AND expert_id = v_expert_profile_id
  AND status IN ('requested', 'confirmed');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Appointment not found or not cancellable'
    );
  END IF;

  UPDATE appointments
  SET
    status = 'cancelled_by_expert',
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancellation_reason = p_reason,
    refund_amount = v_appointment.amount_paid,
    payment_status = 'refunded'
  WHERE id = p_appointment_id;

  INSERT INTO refund_logs (
    booking_type,
    booking_id,
    amount,
    reason,
    processed_by,
    status
  ) VALUES (
    'appointment',
    p_appointment_id,
    v_appointment.amount_paid,
    p_reason,
    auth.uid(),
    'pending'
  );

  INSERT INTO booking_notifications (
    user_id,
    booking_type,
    booking_id,
    notification_type,
    title,
    message
  ) VALUES (
    v_appointment.client_id,
    'appointment',
    p_appointment_id,
    'cancelled_by_expert',
    'Termin durch Expert:in storniert',
    'Der Termin wurde durch die Expert:in storniert. Du erhältst eine vollständige Rückerstattung.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_amount', v_appointment.amount_paid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cancel room booking by expert
CREATE OR REPLACE FUNCTION cancel_room_booking_by_expert(
  p_booking_id uuid,
  p_reason text DEFAULT ''
)
RETURNS jsonb AS $$
DECLARE
  v_booking room_bookings;
  v_expert_profile_id uuid;
  v_refund_amount decimal(10,2);
  v_within_window boolean;
  v_new_status text;
BEGIN
  SELECT id INTO v_expert_profile_id
  FROM expert_profiles
  WHERE user_id = auth.uid();

  SELECT * INTO v_booking
  FROM room_bookings
  WHERE id = p_booking_id
  AND expert_id = v_expert_profile_id
  AND status = 'paid';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Room booking not found or not cancellable'
    );
  END IF;

  v_within_window := is_within_cancellation_window(v_booking.start_time);

  IF v_within_window THEN
    v_refund_amount := v_booking.amount_paid;
    v_new_status := 'cancelled_refunded';
  ELSE
    v_refund_amount := 0;
    v_new_status := 'cancelled_no_refund';
  END IF;

  UPDATE room_bookings
  SET
    status = v_new_status,
    cancelled_at = now(),
    cancellation_reason = p_reason,
    refund_amount = v_refund_amount,
    payment_status = CASE WHEN v_refund_amount > 0 THEN 'refunded' ELSE payment_status END
  WHERE id = p_booking_id;

  IF v_refund_amount > 0 THEN
    INSERT INTO refund_logs (
      booking_type,
      booking_id,
      amount,
      reason,
      processed_by,
      status
    ) VALUES (
      'room_booking',
      p_booking_id,
      v_refund_amount,
      p_reason,
      auth.uid(),
      'pending'
    );
  END IF;

  INSERT INTO booking_notifications (
    user_id,
    booking_type,
    booking_id,
    notification_type,
    title,
    message
  ) VALUES (
    (SELECT user_id FROM provider_profiles WHERE id = v_booking.room_provider_id),
    'room_booking',
    p_booking_id,
    CASE WHEN v_within_window THEN 'cancelled_refunded' ELSE 'cancelled_no_refund' END,
    'Raumbuchung storniert',
    CASE
      WHEN v_within_window THEN 'Expert:in hat die Raumbuchung rechtzeitig storniert.'
      ELSE 'Expert:in hat die Raumbuchung kurzfristig storniert. Du behältst die Zahlung.'
    END
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_amount', v_refund_amount,
    'within_window', v_within_window,
    'new_status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Confirm appointment by expert
CREATE OR REPLACE FUNCTION confirm_appointment_by_expert(
  p_appointment_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_appointment appointments;
  v_expert_profile_id uuid;
BEGIN
  SELECT id INTO v_expert_profile_id
  FROM expert_profiles
  WHERE user_id = auth.uid();

  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id
  AND expert_id = v_expert_profile_id
  AND status = 'requested';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Appointment not found or already confirmed'
    );
  END IF;

  UPDATE appointments
  SET status = 'confirmed'
  WHERE id = p_appointment_id;

  INSERT INTO booking_notifications (
    user_id,
    booking_type,
    booking_id,
    notification_type,
    title,
    message
  ) VALUES (
    v_appointment.client_id,
    'appointment',
    p_appointment_id,
    'confirmed',
    'Termin bestätigt',
    'Dein Termin wurde von der Expert:in bestätigt!'
  );

  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_expert_id ON appointments(expert_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_room_bookings_status ON room_bookings(status);
CREATE INDEX IF NOT EXISTS idx_room_bookings_expert_id ON room_bookings(expert_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_start_time ON room_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_user_id ON booking_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_is_read ON booking_notifications(is_read);