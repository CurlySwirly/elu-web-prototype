/*
  Fix infinite RLS recursion on profiles.

  Cycle was:
    profiles ("Experts can view their clients profiles")
      → expert_profiles
      → "Admins can view all expert profiles" (SELECT FROM profiles)
      → profiles again

  Use SECURITY DEFINER helpers so nested checks bypass RLS.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.expert_can_read_client_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    INNER JOIN public.expert_profiles ep ON ep.id = a.expert_id
    WHERE ep.user_id = auth.uid()
      AND a.client_id = target_profile_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.expert_can_read_client_profile(uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Experts can view their clients profiles" ON public.profiles;
CREATE POLICY "Experts can view their clients profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.expert_can_read_client_profile(id));

DROP POLICY IF EXISTS "Admins can view all expert profiles" ON public.expert_profiles;
CREATE POLICY "Admins can view all expert profiles"
  ON public.expert_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
