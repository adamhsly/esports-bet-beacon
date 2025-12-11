-- Function to check and upgrade affiliate tier based on referred user count
CREATE OR REPLACE FUNCTION check_and_upgrade_affiliate_tier()
RETURNS TRIGGER AS $$
DECLARE
  referred_count INTEGER;
  current_tier TEXT;
  new_tier TEXT;
  new_rev_share INTEGER;
BEGIN
  -- Only proceed if referrer_code is set
  IF NEW.referrer_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total referred users for this affiliate
  SELECT COUNT(*) INTO referred_count
  FROM profiles
  WHERE referrer_code = NEW.referrer_code;

  -- Determine new tier based on count
  -- Gold: 200+ users (30%), Silver: 50-199 users (25%), Bronze: 0-49 users (20%)
  IF referred_count >= 200 THEN
    new_tier := 'gold';
    new_rev_share := 30;
  ELSIF referred_count >= 50 THEN
    new_tier := 'silver';
    new_rev_share := 25;
  ELSE
    new_tier := 'bronze';
    new_rev_share := 20;
  END IF;

  -- Get current tier
  SELECT tier INTO current_tier
  FROM creator_affiliates
  WHERE referral_code = NEW.referrer_code;

  -- Only upgrade, never downgrade (bronze < silver < gold)
  IF current_tier IS NOT NULL AND (
    (current_tier = 'bronze' AND new_tier IN ('silver', 'gold')) OR
    (current_tier = 'silver' AND new_tier = 'gold')
  ) THEN
    UPDATE creator_affiliates
    SET tier = new_tier, rev_share_percent = new_rev_share, updated_at = now()
    WHERE referral_code = NEW.referrer_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table for affiliate tier check
CREATE TRIGGER trigger_affiliate_tier_check
AFTER INSERT OR UPDATE OF referrer_code ON profiles
FOR EACH ROW
WHEN (NEW.referrer_code IS NOT NULL)
EXECUTE FUNCTION check_and_upgrade_affiliate_tier();