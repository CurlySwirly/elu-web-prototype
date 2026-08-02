/*
  # Public expert sedcard data (reviews + review authors)

  Clients opening /app/experten/[id] from past bookings need:
  - reviews readable by anon/authenticated
  - review author names (client profiles) readable when they left a review
*/

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can view review author profiles" ON public.profiles;
CREATE POLICY "Public can view review author profiles"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reviews r
      WHERE r.client_id = profiles.id
    )
  );
