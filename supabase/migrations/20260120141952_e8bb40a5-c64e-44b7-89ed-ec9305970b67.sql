-- Create table to cache Stripe FX rates
CREATE TABLE stripe_fx_rates (
  currency_code TEXT PRIMARY KEY,
  rate_from_gbp DECIMAL(12, 8) NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stripe_fx_rates ENABLE ROW LEVEL SECURITY;

-- Allow public read access (rates are not sensitive)
CREATE POLICY "Public read access" ON stripe_fx_rates FOR SELECT USING (true);

-- Allow service role to insert/update
CREATE POLICY "Service role can manage rates" ON stripe_fx_rates 
FOR ALL USING (true) WITH CHECK (true);