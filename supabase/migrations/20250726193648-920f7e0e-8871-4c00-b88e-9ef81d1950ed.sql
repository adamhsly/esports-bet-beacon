-- Enable RLS and add public read access to pandascore_players_master table
ALTER TABLE public.pandascore_players_master ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to all player data
CREATE POLICY "Public read access to pandascore players" 
ON public.pandascore_players_master 
FOR SELECT 
USING (true);