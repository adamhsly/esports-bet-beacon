import React from 'react';
import { Lock, Check, X, Star } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PickemsEnrichedMatch } from '@/types/pickems';
import { isMatchLocked } from '@/lib/pickems';
import { Input } from '@/components/ui/input';

interface Props {
  match: PickemsEnrichedMatch;
  pickedTeamId: string | null;
  isCorrect: boolean | null | undefined;
  onPick: (matchId: string, teamId: string) => void;
  isTiebreaker?: boolean;
  tiebreakerValue?: number | null;
  onTiebreakerChange?: (matchId: string, value: number | null) => void;
}

export const PickemsMatchRow: React.FC<Props> = ({
  match,
  pickedTeamId,
  isCorrect,
  onPick,
  isTiebreaker,
  tiebreakerValue,
  onTiebreakerChange,
}) => {
  const locked = isMatchLocked(match.start_time, match.status);
  const teamA = match.team_a;
  const teamB = match.team_b;
  const winnerId = match.winner_id != null ? String(match.winner_id) : null;
  const finished = match.status === 'finished';
  const bo = match.number_of_games ?? 3;
  const minMaps = Math.ceil(bo / 2);
  const maxMaps = bo;

  const renderTeam = (team: typeof teamA) => {
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
    <div className={cn(
      'bg-slate-800/40 border rounded-lg p-3 space-y-2',
      isTiebreaker ? 'border-amber-500/50' : 'border-slate-700'
    )}>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="truncate flex items-center gap-1.5">
          {isTiebreaker && (
            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
              <Star className="h-3 w-3 fill-amber-400" /> Tiebreaker
            </span>
          )}
          <span className="truncate">
            {match.tournament_name || match.league_name || match.esport_type}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {match.start_time && format(new Date(match.start_time), 'MMM d, HH:mm')}
          {locked && <Lock className="h-3 w-3" />}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {renderTeam(teamA)}
        <span className="text-gray-500 text-xs font-bold">VS</span>
        {renderTeam(teamB)}
      </div>

      {isTiebreaker && onTiebreakerChange && (
        <div className="pt-2 border-t border-slate-700/50">
          <label className="text-xs text-amber-300 block mb-1">
            Tiebreaker: total maps played (Bo{bo})
          </label>
          <Input
            type="number"
            inputMode="numeric"
            min={minMaps}
            max={maxMaps}
            disabled={locked}
            value={tiebreakerValue ?? ''}
            placeholder={`${minMaps}–${maxMaps}`}
            onChange={(e) => {
              const v = e.target.value === '' ? null : Math.max(minMaps, Math.min(maxMaps, Number(e.target.value)));
              onTiebreakerChange(match.match_id, v);
            }}
            className="h-8 w-24 bg-slate-900/60 border-slate-700"
          />
        </div>
      )}
    </div>
  );
};
