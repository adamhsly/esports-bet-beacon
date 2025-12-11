-- Allow users to view their own affiliate record by email
CREATE POLICY "Users can view own affiliate by email"
ON public.creator_affiliates
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));