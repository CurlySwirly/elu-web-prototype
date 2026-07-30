/*
  # Allow clients to read expert availability for booking/reschedule

  Clients need to see available slots when booking or moving appointments.
*/

DROP POLICY IF EXISTS "Authenticated users can read expert availability" ON expert_availability;
CREATE POLICY "Authenticated users can read expert availability"
  ON expert_availability FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read expert absences" ON expert_absences;
CREATE POLICY "Authenticated users can read expert absences"
  ON expert_absences FOR SELECT
  TO authenticated
  USING (true);
