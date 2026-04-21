import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Gamepad2 } from 'lucide-react';
import { format } from 'date-fns';
import type { PickemsSlate } from '@/types/pickems';

const ESPORT_LABELS: Record<string, string> = {
  'counter-strike': 'CS2',
  'cs-go': 'CS2',
  'cs2': 'CS2',
  'lol': 'League of Legends',
  'league-of-legends': 'League of Legends',
  'dota2': 'Dota 2',
  'dota-2': 'Dota 2',
  'valorant': 'Valorant',
  'rainbow-6-siege': 'Rainbow Six',
  'rocket-league': 'Rocket League',
  'starcraft-2': 'StarCraft 2',
  'overwatch': 'Overwatch',
  'king-of-glory': 'Honor of Kings',
  'call-of-duty': 'Call of Duty',
  'lol-wild-rift': 'Wild Rift',
  'pubg': 'PUBG',
  'mobile-legends': 'Mobile Legends',
  'ea-sports-fc': 'EA Sports FC',
};

export const formatEsportLabel = (val?: string | null) =>
  val ? (ESPORT_LABELS[val] ?? val) : null;

// Brand-ish colour per game
const ESPORT_COLORS: Record<string, string> = {
  'counter-strike': 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  'cs-go': 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  'cs2': 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  'lol': 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  'league-of-legends': 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  'lol-wild-rift': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  'dota2': 'bg-red-500/15 text-red-300 border-red-500/40',
  'dota-2': 'bg-red-500/15 text-red-300 border-red-500/40',
  'valorant': 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  'rainbow-6-siege': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
  'rocket-league': 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  'starcraft-2': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  'overwatch': 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  'king-of-glory': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40',
  'call-of-duty': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  'pubg': 'bg-lime-500/15 text-lime-300 border-lime-500/40',
  'mobile-legends': 'bg-violet-500/15 text-violet-300 border-violet-500/40',
  'ea-sports-fc': 'bg-green-500/15 text-green-300 border-green-500/40',
};

export const getEsportPillClass = (val?: string | null) =>
  (val && ESPORT_COLORS[val]) || 'bg-theme-purple/15 text-theme-purple border-theme-purple/40';

interface Props {
  slate: PickemsSlate;
  matchCount?: number;
}

const statusColor: Record<string, string> = {
  published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  closed: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  settled: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  draft: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
};

export const PickemsSlateCard: React.FC<Props> = ({ slate, matchCount }) => {
  const gameLabel = formatEsportLabel(slate.esport_type);
  return (
    <Link to={`/pickems/${slate.id}`}>
      <Card className="bg-slate-800/60 border-slate-700 hover:border-theme-purple/60 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-semibold text-base leading-tight">{slate.name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {gameLabel && (
                <Badge variant="outline" className="bg-theme-purple/15 text-theme-purple border-theme-purple/40 text-[10px]">
                  <Gamepad2 className="h-3 w-3 mr-1" />
                  {gameLabel}
                </Badge>
              )}
              {slate.status !== 'published' && (
                <Badge variant="outline" className={statusColor[slate.status] ?? ''}>
                  {slate.status}
                </Badge>
              )}
            </div>
          </div>
          {slate.tournament_name && (
            <p className="text-xs text-gray-300 flex items-center gap-1 font-medium">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span className="truncate">{slate.tournament_name}</span>
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(slate.start_date), 'MMM d')} – {format(new Date(slate.end_date), 'MMM d')}
            </span>
            {matchCount !== undefined && (
              <span>{matchCount} {matchCount === 1 ? 'match' : 'matches'}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
