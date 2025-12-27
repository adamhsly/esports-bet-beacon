-- Clean up duplicate affiliate record for memethrow20@gmail.com
-- Keep the newer one (53c450cb-affd-4772-9075-42246222a441), delete the older one
DELETE FROM public.creator_affiliates 
WHERE id = '2d3bb13e-e31b-4c14-ac58-d449ea6ad510';