-- Drop the broken policies that use auth.users subquery
DROP POLICY IF EXISTS "Users can view own affiliate by email" ON public.creator_affiliates;
DROP POLICY IF EXISTS "Users can update own affiliate by email" ON public.creator_affiliates;

-- Recreate using auth.email() which is accessible
CREATE POLICY "Users can view own affiliate by email" 
ON public.creator_affiliates 
FOR SELECT 
USING (email = auth.email());

CREATE POLICY "Users can update own affiliate by email" 
ON public.creator_affiliates 
FOR UPDATE 
USING (email = auth.email());