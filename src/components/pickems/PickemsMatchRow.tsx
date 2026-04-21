import React from 'react';
import { Lock, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PickemsEnrichedMatch } from '@/types/pickems';
import { isMatchLocked } from '@/lib/pickems';

interface Props {
  match: PickemsEnrichedMatch;
  pickedTeamId: string | null;
  isCorrect: boolean | null | undefined;
  onPick: (matchId: string, teamId: string) => void;
}

export const PickemsMatchRow: React.FC<Props> = ({ match, pickedTeamId, isCorrect, onPick }) => {
  const locked = isMatchLocked(match.start_time, match.status);
  const teamA = match.team_a;
  const teamB = match.team_b;
  const winnerId = match.winner_id != null ? String(match.winner_id) : null;
  const finished = match.status === 'finished';

  const renderTeam = (team: typeof teamA, side: 'a' | 'b') => {
    if (!team) return <div className="flex-1 p-3 text-gray-500 text-sm">TBD</div>;
    const teamId = String(team.id);
    const isPicked = pickedTeamId === teamId;
    const isWinner = finished && winnerId === teamId;
    const isLoser = finished && winnerId && winnerId !== teamId;

    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => onPick(match.match_id, teamId)}
        className={cn(
          'flex-1 flex items-center gap-2 p-3 rounded-md border transition-all text-left',
          'disabled:cursor-not-allowed',
          isPicked
            ? 'border-theme-purple bg-theme-purple/15'
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-500',
          locked && !isPicked && 'opacity-60',
          finished && isWinner && 'ring-1 ring-emerald-500/60',
          isPicked && finished && isCorrect === true && 'border-emerald-500 bg-emerald-500/15',
          isPicked && finished && isCorrect === false && 'border-rose-500 bg-rose-500/15'
        )}
      >
        {team.image_url && (
          <img src={team.image_url} alt={team.name} className="w-7 h-7 object-contain" />
        )}
        <span className="text-sm font-medium text-white truncate flex-1">{team.name}</span>
        {isPicked && finished && isCorrect === true && <Check className="h-4 w-4 text-emerald-400" />}
        {isPicked && finished && isCorrect === false && <X className="h-4 w-4 text-rose-400" />}
        {isLoser && !isPicked && <X className="h-3 w-3 text-rose-500/60" />}
      </button>
    );
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="truncate">
          {match.tournament_name || match.league_name || match.esport_type}
        </span>
        <span className="flex items-center gap-2">
          {match.start_time && format(new Date(match.start_time), 'MMM d, HH:mm')}
          {locked && <Lock className="h-3 w-3" />}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {renderTeam(teamA, 'a')}
        <span className="text-gray-500 text-xs font-bold">VS</span>
        {renderTeam(teamB, 'b')}
      </div>
    </div>
  );
};
