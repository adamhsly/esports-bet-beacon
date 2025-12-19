-- Minimal page view tracking table (GDPR compliant - no PII)
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  page_url text NOT NULL,
  referrer text
);

-- Enable RLS but allow public inserts (no auth required for tracking)
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (tracking endpoint is public)
CREATE POLICY "Allow public insert for page tracking"
ON public.page_views
FOR INSERT
WITH CHECK (true);

-- Only admins can read (for analytics)
CREATE POLICY "Admins can view page views"
ON public.page_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for efficient querying by date
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);