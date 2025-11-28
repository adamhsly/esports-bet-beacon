-- Randomize capitalization in test user usernames
UPDATE profiles
SET username = (
  SELECT string_agg(
    CASE WHEN random() > 0.5 THEN upper(ch) ELSE lower(ch) END, 
    ''
  )
  FROM unnest(string_to_array(username, NULL)) AS ch
)
WHERE test = true AND username IS NOT NULL;