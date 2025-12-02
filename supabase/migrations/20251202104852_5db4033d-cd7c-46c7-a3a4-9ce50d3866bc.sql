-- Add stripe_price_id and team_type columns to fantasy_rounds
ALTER TABLE fantasy_rounds 
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS team_type text DEFAULT 'both' CHECK (team_type IN ('pro', 'amateur', 'both'));

COMMENT ON COLUMN fantasy_rounds.stripe_price_id IS 'Optional Stripe Price ID to use for checkout instead of dynamic pricing';
COMMENT ON COLUMN fantasy_rounds.team_type IS 'Filter for team types: pro (pandascore), amateur (faceit), or both';
COMMENT ON COLUMN fantasy_rounds.game_type IS 'Esport game filter: counter-strike, league-of-legends, dota-2, etc.';