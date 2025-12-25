-- Add admin policies for platform dashboard stats
-- These allow users with admin role to view all records

-- Profiles - admins can view all
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Round entries - admins can view all
CREATE POLICY "Admins can view all round entries"
ON public.round_entries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Premium receipts - admins can view all
CREATE POLICY "Admins can view all premium receipts"
ON public.premium_receipts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fantasy round winners - admins can view all
CREATE POLICY "Admins can view all fantasy round winners"
ON public.fantasy_round_winners
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fantasy round picks - already has public read, but adding explicit admin policy
CREATE POLICY "Admins can view all fantasy round picks"
ON public.fantasy_round_picks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));