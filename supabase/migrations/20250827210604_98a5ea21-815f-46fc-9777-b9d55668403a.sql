-- Create storage bucket for share cards
INSERT INTO storage.buckets (id, name, public) VALUES ('shares', 'shares', true);

-- Create RLS policies for share cards
CREATE POLICY "Share cards are publicly readable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shares');

CREATE POLICY "Users can upload share cards" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'shares' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own share cards" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'shares' AND auth.uid()::text = (storage.foldername(name))[1]);