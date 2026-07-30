/*
  # Personal calendar events for clients

  Clients can add their own appointments (outside expert bookings)
  to the dashboard calendar.
*/

CREATE TABLE IF NOT EXISTS personal_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text DEFAULT '',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE personal_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own personal events"
  ON personal_calendar_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own personal events"
  ON personal_calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own personal events"
  ON personal_calendar_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own personal events"
  ON personal_calendar_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_personal_calendar_events_user_id
  ON personal_calendar_events(user_id);

CREATE INDEX IF NOT EXISTS idx_personal_calendar_events_start_time
  ON personal_calendar_events(start_time);
