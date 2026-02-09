-- Reopen the Feb 9 round since it still has until Feb 16 to run
UPDATE fantasy_rounds 
SET status = 'open', updated_at = now()
WHERE id = 'b435d038-5772-46ed-9e5e-95cb8ce9fe53';