/*
  Allow experts to read profile data of clients who booked with them
  (needed for calendar / booking lists showing client names).
*/

DROP POLICY IF EXISTS "Experts can view their clients profiles" ON profiles;

CREATE POLICY "Experts can view their clients profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT a.client_id
      FROM appointments a
      INNER JOIN expert_profiles ep ON ep.id = a.expert_id
      WHERE ep.user_id = auth.uid()
    )
  );
