-- Allow users to update their own winner notification status
CREATE POLICY "Users can update own notification status"
ON fantasy_round_winners
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);