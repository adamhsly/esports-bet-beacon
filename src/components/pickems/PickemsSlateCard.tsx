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
  return (
    <Link to={`/pickems/${slate.id}`}>
      <Card className="bg-slate-800/60 border-slate-700 hover:border-theme-purple/60 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-semibold text-base leading-tight">{slate.name}</h3>
            <Badge variant="outline" className={statusColor[slate.status] ?? ''}>
              {slate.status}
            </Badge>
          </div>
          {slate.tournament_name && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {slate.tournament_name}
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
