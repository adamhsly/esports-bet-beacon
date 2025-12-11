-- Allow users to update their own affiliate record (to link user_id)
CREATE POLICY "Users can update own affiliate by email"
ON public.creator_affiliates
FOR UPDATE
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));