/*
  # Public browse of verified experts (landing / guest)

  The verification migration restricted expert_profiles SELECT to `authenticated`
  only, so guests on /app/experten saw an empty list.

  Restore anonymous/public read for verified experts (and their profile names/avatars).
*/

DROP POLICY IF EXISTS "Public can view verified experts" ON public.expert_profiles;
CREATE POLICY "Public can view verified experts"
  ON public.expert_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    verification_status = 'verified'
    OR is_verified = true
  );

DROP POLICY IF EXISTS "Public can view expert user profiles" ON public.profiles;
CREATE POLICY "Public can view expert user profiles"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (role = 'expert');

DROP POLICY IF EXISTS "Public can view expert offers" ON public.expert_offers;
CREATE POLICY "Public can view expert offers"
  ON public.expert_offers
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expert_profiles ep
      WHERE ep.id = expert_id
        AND (ep.verification_status = 'verified' OR ep.is_verified = true)
    )
  );
