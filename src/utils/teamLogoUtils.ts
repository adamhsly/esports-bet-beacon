/**
 * UI-only team logo helper (no network / no logging).
 * Prefers URLs already on the team object. Fallbacks are local & deterministic.
 * NOTE: Do NOT export a function named `getTeamLogoUrl` here to avoid clashes
 * with '@/lib/resolveLogoUrl'.
 */

const PLACEHOLDER = '/placeholder.svg';

// Minimal name -> filename map (extend as needed)
const BASE_LOGO_PATH =
  'https://raw.githubusercontent.com/lootmarket/esport-team-logos/master';

const TEAM_LOGO_NAME_MAP: Record<string, string> = {
  // CS2/CSGO
  'natus vincere': 'navi',
  navi: 'navi',
  'team liquid': 'liquid',
  liquid: 'liquid',
  fnatic: 'fnatic',
  faze: 'faze',
  'faze clan': 'faze',
  astralis: 'astralis',
  g2: 'g2',
  'g2 esports': 'g2',
  cloud9: 'cloud9',
  vitality: 'vitality',
  'team vitality': 'vitality',
  ence: 'ence',
  'ninjas in pyjamas': 'nip',
  nip: 'nip',
  complexity: 'complexity',
  'complexity gaming': 'complexity',
  'virtus.pro': 'virtuspro',
  virtuspro: 'virtuspro',
  heroic: 'heroic',
  og: 'og',
  mouz: 'mouz',
  mousesports: 'mouz',
  big: 'big',
  spirit: 'spirit',
  'team spirit': 'spirit',
  // LoL
  t1: 't1',
  'sk telecom t1': 't1',
  skt: 't1',
  damwon: 'damwon',
  'damwon gaming': 'damwon',
  'dwg kia': 'damwon',
  'dplus kia': 'damwon',
  dk: 'damwon',
  rng: 'rng',
  'royal never give up': 'rng',
  edg: 'edg',
  'edward gaming': 'edg',
  'mad lions': 'mad',
  'gen.g': 'geng',
  geng: 'geng',
  'gen.g esports': 'geng',
  'hanwha life esports': 'hle',
  hle: 'hle',
  '100 thieves': '100t',
  '100t': '100t',
  'team solomid': 'tsm',
  tsm: 'tsm',
  c9: 'cloud9',
  'kt rolster': 'kt',
  kt: 'kt',
  drx: 'drx',
  'fredit brion': 'brion',
  brion: 'brion',
  'nongshim red force': 'ns',
  ns: 'ns',
  'sandbox gaming': 'sandbox',
  sandbox: 'sandbox',
  'funplus phoenix': 'fpx',
  fpx: 'fpx',
  'jd gaming': 'jdg',
  jdg: 'jdg',
  // Dota
  'team secret': 'secret',
  secret: 'secret',
  'evil geniuses': 'eg',
  eg: 'eg',
  lgd: 'lgd',
  'psg.lgd': 'lgd',
  nigma: 'nigma',
  alliance: 'alliance',
  vp: 'virtuspro',
  // BR set
  oddik: 'oddik',
  fluxo: 'fluxo',
  imperial: 'imperial',
  'imperial esports': 'imperial',
  mibr: 'mibr',
  'made in brazil': 'mibr',
  furia: 'furia',
  'furia esports': 'furia',
  loud: 'loud',
  // misc
  'pain gaming': 'pain',
  pain: 'pain',
  legacy: 'legacy',
  'legacy esports': 'legacy',
  'red canids': 'redcanids',
  sharks: 'sharks',
  'sharks esports': 'sharks',
};

function normalize(name?: string | null) {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isValidUrl(url?: string | null) {
  if (!url) return false;
  if (url === PLACEHOLDER) return false;
  if (url.includes('undefined')) return false;
  return true;
}

function mapTeamLogoByName(teamName: string): string | null {
  const key = normalize(teamName);
  if (!key) return null;

  const direct = TEAM_LOGO_NAME_MAP[key];
  if (direct) return `${BASE_LOGO_PATH}/${direct}.png`;

  const partialKey = Object.keys(TEAM_LOGO_NAME_MAP).find(
    (k) => key.includes(k) || k.includes(key)
  );
  if (partialKey) return `${BASE_LOGO_PATH}/${TEAM_LOGO_NAME_MAP[partialKey]}.png`;

  return null;
}

export function getEnhancedTeamLogoUrl(team: {
  name: string;
  logo?: string | null;
  image_url?: string | null;
  hash_image?: string | null;
}): string {
  // 1) Prefer explicit URLs provided by the API
  if (isValidUrl(team?.logo)) return team.logo as string;
  if (isValidUrl(team?.image_url)) return team.image_url as string;

  // 2) Faceit-style hashed image
  if (team?.hash_image) {
    return `https://images.sportdevs.com/${team.hash_image}.png`;
  }

  // 3) Name map fallback (best-effort)
  const mapped = team?.name ? mapTeamLogoByName(team.name) : null;
  return mapped ?? PLACEHOLDER;
}

/**
 * Legacy trap: some code accidentally imported a conflicting name.
 * Keep this here to fail loudly if it happens again.
 */
export function getTeamLogoUrl(): never {
  throw new Error(
    "Do not import getTeamLogoUrl from 'teamLogoUtils'. Use '@/lib/resolveLogoUrl'."
  );
}
/**
 * UI-only team logo helper (no network / no logging).
 * Prefers URLs already on the team object. Fallbacks are local & deterministic.
 * NOTE: Do NOT export a function named `getTeamLogoUrl` here to avoid clashes
 * with '@/lib/resolveLogoUrl'.
 */

const PLACEHOLDER = '/placeholder.svg';

// Minimal name -> filename map (extend as needed)
const BASE_LOGO_PATH =
  'https://raw.githubusercontent.com/lootmarket/esport-team-logos/master';

const TEAM_LOGO_NAME_MAP: Record<string, string> = {
  // CS2/CSGO
  'natus vincere': 'navi',
  navi: 'navi',
  'team liquid': 'liquid',
  liquid: 'liquid',
  fnatic: 'fnatic',
  faze: 'faze',
  'faze clan': 'faze',
  astralis: 'astralis',
  g2: 'g2',
  'g2 esports': 'g2',
  cloud9: 'cloud9',
  vitality: 'vitality',
  'team vitality': 'vitality',
  ence: 'ence',
  'ninjas in pyjamas': 'nip',
  nip: 'nip',
  complexity: 'complexity',
  'complexity gaming': 'complexity',
  'virtus.pro': 'virtuspro',
  virtuspro: 'virtuspro',
  heroic: 'heroic',
  og: 'og',
  mouz: 'mouz',
  mousesports: 'mouz',
  big: 'big',
  spirit: 'spirit',
  'team spirit': 'spirit',
  // LoL
  t1: 't1',
  'sk telecom t1': 't1',
  skt: 't1',
  damwon: 'damwon',
  'damwon gaming': 'damwon',
  'dwg kia': 'damwon',
  'dplus kia': 'damwon',
  dk: 'damwon',
  rng: 'rng',
  'royal never give up': 'rng',
  edg: 'edg',
  'edward gaming': 'edg',
  'mad lions': 'mad',
  'gen.g': 'geng',
  geng: 'geng',
  'gen.g esports': 'geng',
  'hanwha life esports': 'hle',
  hle: 'hle',
  '100 thieves': '100t',
  '100t': '100t',
  'team solomid': 'tsm',
  tsm: 'tsm',
  c9: 'cloud9',
  'kt rolster': 'kt',
  kt: 'kt',
  drx: 'drx',
  'fredit brion': 'brion',
  brion: 'brion',
  'nongshim red force': 'ns',
  ns: 'ns',
  'sandbox gaming': 'sandbox',
  sandbox: 'sandbox',
  'funplus phoenix': 'fpx',
  fpx: 'fpx',
  'jd gaming': 'jdg',
  jdg: 'jdg',
  // Dota
  'team secret': 'secret',
  secret: 'secret',
  'evil geniuses': 'eg',
  eg: 'eg',
  lgd: 'lgd',
  'psg.lgd': 'lgd',
  nigma: 'nigma',
  alliance: 'alliance',
  vp: 'virtuspro',
  // BR set
  oddik: 'oddik',
  fluxo: 'fluxo',
  imperial: 'imperial',
  'imperial esports': 'imperial',
  mibr: 'mibr',
  'made in brazil': 'mibr',
  furia: 'furia',
  'furia esports': 'furia',
  loud: 'loud',
  // misc
  'pain gaming': 'pain',
  pain: 'pain',
  legacy: 'legacy',
  'legacy esports': 'legacy',
  'red canids': 'redcanids',
  sharks: 'sharks',
  'sharks esports': 'sharks',
};

function normalize(name?: string | null) {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isValidUrl(url?: string | null) {
  if (!url) return false;
  if (url === PLACEHOLDER) return false;
  if (url.includes('undefined')) return false;
  return true;
}

function mapTeamLogoByName(teamName: string): string | null {
  const key = normalize(teamName);
  if (!key) return null;

  const direct = TEAM_LOGO_NAME_MAP[key];
  if (direct) return `${BASE_LOGO_PATH}/${direct}.png`;

  const partialKey = Object.keys(TEAM_LOGO_NAME_MAP).find(
    (k) => key.includes(k) || k.includes(key)
  );
  if (partialKey) return `${BASE_LOGO_PATH}/${TEAM_LOGO_NAME_MAP[partialKey]}.png`;

  return null;
}

export function getEnhancedTeamLogoUrl(team: {
  name: string;
  logo?: string | null;
  image_url?: string | null;
  hash_image?: string | null;
}): string {
  // 1) Prefer explicit URLs provided by the API
  if (isValidUrl(team?.logo)) return team.logo as string;
  if (isValidUrl(team?.image_url)) return team.image_url as string;

  // 2) Faceit-style hashed image
  if (team?.hash_image) {
    return `https://images.sportdevs.com/${team.hash_image}.png`;
  }

  // 3) Name map fallback (best-effort)
  const mapped = team?.name ? mapTeamLogoByName(team.name) : null;
  return mapped ?? PLACEHOLDER;
}

/**
 * Legacy trap: some code accidentally imported a conflicting name.
 * Keep this here to fail loudly if it happens again.
 */
export function getTeamLogoUrl(): never {
  throw new Error(
    "Do not import getTeamLogoUrl from 'teamLogoUtils'. Use '@/lib/resolveLogoUrl'."
  );
}
