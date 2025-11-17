-- Add budget and game configuration columns to fantasy_rounds
ALTER TABLE fantasy_rounds 
ADD COLUMN IF NOT EXISTS budget_cap INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS game_source TEXT DEFAULT 'both',
ADD COLUMN IF NOT EXISTS game_type TEXT;

-- Add check constraint for budget_cap
ALTER TABLE fantasy_rounds
ADD CONSTRAINT budget_cap_range CHECK (budget_cap IS NULL OR (budget_cap >= 30 AND budget_cap <= 200));

-- Add check constraint for game_source
ALTER TABLE fantasy_rounds
ADD CONSTRAINT game_source_values CHECK (game_source IS NULL OR game_source IN ('pro', 'amateur', 'both'));