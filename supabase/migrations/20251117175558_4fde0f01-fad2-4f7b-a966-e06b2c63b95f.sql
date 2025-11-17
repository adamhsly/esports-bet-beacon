-- Add RLS policy to allow authenticated users to create private fantasy rounds
CREATE POLICY "Users can create private fantasy rounds"
ON public.fantasy_rounds
FOR INSERT
TO authenticated
WITH CHECK (
  is_private = true 
  AND created_by = auth.uid()
);