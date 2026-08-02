/*
  # Public read of expert availability (guest booking)

  Guests on /app/buchen need to see weekly availability and absences
  to pick a slot. Previously only authenticated users could SELECT.
*/

DROP POLICY IF EXISTS "Public can view expert availability" ON public.expert_availability;
CREATE POLICY "Public can view expert availability"
  ON public.expert_availability
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can view expert absences" ON public.expert_absences;
CREATE POLICY "Public can view expert absences"
  ON public.expert_absences
  FOR SELECT
  TO anon, authenticated
  USING (true);
