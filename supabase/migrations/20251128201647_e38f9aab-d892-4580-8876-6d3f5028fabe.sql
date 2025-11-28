-- Update ALL test users with gaming-style usernames (not just NULL ones)
WITH ranked_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM profiles
  WHERE test = true
),
prefixes AS (
  SELECT unnest(ARRAY[
    'xSniper', 'DarkLord', 'NightRaven', 'ShadowX', 'PhantomZ',
    'VenomX', 'ToxicZ', 'ChaoticX', 'SavageZ', 'BrutalX',
    'FatalZ', 'LethalX', 'DeadlyZ', 'ViciousX', 'FierceZ',
    'WildX', 'RogueZ', 'RebelX', 'OutcastZ', 'ExileX',
    'GhostX', 'ShadowZ', 'PhantomX', 'WraithZ', 'SpecterX',
    'DemonX', 'AngelZ', 'DiabloX', 'InfernoZ', 'HellFireX',
    'IceX', 'FrostZ', 'ColdX', 'FreezeZ', 'ChillX',
    'StormX', 'ThunderZ', 'LightningX', 'BoltZ', 'FlashX',
    'BladeX', 'SwordZ', 'DaggerX', 'KnifeZ', 'SlashX',
    'BulletX', 'ShotZ', 'RoundX', 'FragZ', 'BoomX',
    'AceX', 'KingZ', 'QueenX', 'JackZ', 'JokerX',
    'WolfX', 'TigerZ', 'LionX', 'BearZ', 'HawkX',
    'CobraX', 'ViperZ', 'PythonX', 'SnakeZ', 'DragonX',
    'NinjaX', 'SamuraiZ', 'RoninX', 'ShogunZ', 'AssassinX',
    'SniperX', 'RifleZ', 'ShotgunX', 'PistolZ', 'MagnumX'
  ]) AS prefix, generate_series(1, 75) AS idx
)
UPDATE profiles p
SET 
  username = (
    SELECT prefix || '_' || (100 + rn)::text
    FROM ranked_users r
    CROSS JOIN LATERAL (
      SELECT prefix FROM prefixes WHERE idx = 1 + (rn % 75)
    ) pf
    WHERE r.id = p.id
  ),
  full_name = 'Player ' || (SELECT rn FROM ranked_users r WHERE r.id = p.id)::text
WHERE test = true;