-- Fix affiliate_activations SELECT policy to avoid referencing auth.users (can cause RLS evaluation errors)
-- and reliably allow an affiliate to view their own activation rows.

DROP POLICY IF EXISTS "Affiliates can view their own activations" ON public.affiliate_activations;

CREATE POLICY "Affiliates can view their own activations"
ON public.affiliate_activations
FOR SELECT
TO authenticated
USING (
  creator_id IN (
    SELECT ca.id
    FROM public.creator_affiliates ca
    WHERE ca.user_id = auth.uid()
       OR ca.email = auth.email()
  )
);
