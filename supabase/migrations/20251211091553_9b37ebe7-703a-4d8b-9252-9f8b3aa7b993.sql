-- Add RLS policy to allow admins to insert creator affiliates
CREATE POLICY "Admins can insert creator affiliates"
ON public.creator_affiliates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy to allow admins to view all creator affiliates
CREATE POLICY "Admins can view all creator affiliates"
ON public.creator_affiliates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy to allow admins to update creator affiliates
CREATE POLICY "Admins can update creator affiliates"
ON public.creator_affiliates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));