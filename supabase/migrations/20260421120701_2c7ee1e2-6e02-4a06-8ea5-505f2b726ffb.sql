UPDATE pickems_slates ps
SET status = 'published', updated_at = now()
WHERE auto_generated = true
  AND status = 'closed'
  AND EXISTS (
    SELECT 1 FROM pandascore_matches pm
    WHERE pm.tournament_id = ps.source_tournament_id
      AND pm.start_time > now()
  );