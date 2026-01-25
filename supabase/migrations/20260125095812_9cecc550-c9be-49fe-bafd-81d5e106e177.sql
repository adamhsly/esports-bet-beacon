
-- Reset team_summary_sent for last week's paid round so it gets sent
UPDATE fantasy_rounds 
SET team_summary_sent = false 
WHERE id = '71c1619b-cadb-4bb1-800b-c8bc75ba5cff';
