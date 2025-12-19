-- Add fully_loaded column to page_views table
ALTER TABLE public.page_views 
ADD COLUMN fully_loaded boolean NOT NULL DEFAULT false;