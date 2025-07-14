import { Gamepad2, Zap, Trophy, Users } from 'lucide-react';

export interface GameTypeOption {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const GAME_TYPE_OPTIONS: GameTypeOption[] = [
  { label: 'All Games', value: 'all', icon: Gamepad2 },
  { label: 'Counter-Strike', value: 'counter-strike', icon: Zap },
  { label: 'League of Legends', value: 'lol', icon: Trophy },
  { label: 'Dota 2', value: 'dota2', icon: Users },
  { label: 'EA Sports FC', value: 'ea-sports-fc', icon: Users },
  { label: 'Valorant', value: 'valorant', icon: Zap },
  { label: 'Rainbow 6 Siege', value: 'rainbow-6-siege', icon: Zap },
  { label: 'Rocket League', value: 'rocket-league', icon: Users },
  { label: 'StarCraft 2', value: 'starcraft-2', icon: Zap },
  { label: 'Overwatch', value: 'overwatch', icon: Users },
  { label: 'King of Glory', value: 'king-of-glory', icon: Trophy },
  { label: 'Call of Duty', value: 'call-of-duty', icon: Zap },
  { label: 'LoL Wild Rift', value: 'lol-wild-rift', icon: Trophy },
  { label: 'PUBG', value: 'pubg', icon: Zap },
  { label: 'Mobile Legends', value: 'mobile-legends', icon: Users },
];

export const STATUS_FILTER_OPTIONS = [
  { label: 'All Matches', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Finished', value: 'finished' },
];

export const SOURCE_FILTER_OPTIONS = [
  { label: 'All Sources', value: 'all' },
  { label: 'Professional', value: 'professional' },
  { label: 'Amateur', value: 'amateur' },
];