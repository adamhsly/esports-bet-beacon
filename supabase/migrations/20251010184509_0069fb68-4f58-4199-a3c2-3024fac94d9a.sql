-- Backfill match_date for historical FACEIT matches where timestamps are available
UPDATE faceit_matches
SET match_date = COALESCE((started_at)::date, (scheduled_at)::date)
WHERE match_date IS NULL
  AND (started_at IS NOT NULL OR scheduled_at IS NOT NULL);