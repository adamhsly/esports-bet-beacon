UPDATE pickems_slates ps
SET
  tournament_name = COALESCE(
    NULLIF(TRIM(CONCAT_WS(' · ', NULLIF(pt.league_name, ''), NULLIF(pt.serie_name, ''))), ''),
    pt.name,
    ps.tournament_name
  ),
  name = CASE
    WHEN pt.name IS NOT NULL
         AND pt.name <> COALESCE(pt.league_name, '')
         AND pt.name <> COALESCE(pt.serie_name, '')
         AND COALESCE(NULLIF(TRIM(CONCAT_WS(' · ', NULLIF(pt.league_name, ''), NULLIF(pt.serie_name, ''))), ''), '') <> ''
    THEN CONCAT(
      NULLIF(TRIM(CONCAT_WS(' · ', NULLIF(pt.league_name, ''), NULLIF(pt.serie_name, ''))), ''),
      ' – ',
      pt.name
    )
    ELSE COALESCE(
      NULLIF(TRIM(CONCAT_WS(' · ', NULLIF(pt.league_name, ''), NULLIF(pt.serie_name, ''))), ''),
      pt.name,
      ps.name
    )
  END,
  updated_at = now()
FROM pandascore_tournaments pt
WHERE ps.auto_generated = true
  AND ps.source_tournament_id = pt.tournament_id;