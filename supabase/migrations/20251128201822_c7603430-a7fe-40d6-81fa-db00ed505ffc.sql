-- Remove the _XXX number suffix from all test user usernames
UPDATE profiles
SET username = regexp_replace(username, '_[0-9]+$', '')
WHERE test = true;