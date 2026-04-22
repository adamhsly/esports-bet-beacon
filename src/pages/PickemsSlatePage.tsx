import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useSlate, useSlateMatches, useUserEntry, useSubmitPicks } from '@/hooks/usePickems';
import { PickemsMatchRow } from '@/components/pickems/PickemsMatchRow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, BarChart3, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { isMatchLocked } from '@/lib/pickems';

const PickemsSlatePage: React.FC = () => {
  const { slateId } = useParams<{ slateId: string }>();
  const { user } = useAuth();
  const { data: slate, isLoading: slateLoading } = useSlate(slateId);
  const { data: matches, isLoading: matchesLoading } = useSlateMatches(slateId);
  const { data: entryData } = useUserEntry(slateId, user?.id);
  const submit = useSubmitPicks(slateId, user?.id);

  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({});
  const [pendingTiebreaker, setPendingTiebreaker] = useState<number | null>(null);

  useEffect(() => {
    if (entryData?.picks) {
      const initial: Record<string, string> = {};
      entryData.picks.forEach(p => { initial[p.match_id] = p.picked_team_id; });
      setPendingPicks(initial);
    }
    if (entryData?.entry?.tiebreaker_total_maps != null) {
      setPendingTiebreaker(entryData.entry.tiebreaker_total_maps);
    }
  }, [entryData?.entry?.id]);

  const savedById = useMemo(() => {
    const m: Record<string, { picked_team_id: string; is_correct: boolean | null }> = {};
    (entryData?.picks ?? []).forEach(p => {
      m[p.match_id] = { picked_team_id: p.picked_team_id, is_correct: p.is_correct };
    });
    return m;
  }, [entryData?.picks]);

  const tiebreakerMatch = useMemo(
    () => matches?.find(m => m.match_id === slate?.tiebreaker_match_id) ?? null,
    [matches, slate?.tiebreaker_match_id]
  );
  const tiebreakerLocked = tiebreakerMatch ? isMatchLocked(tiebreakerMatch.start_time, tiebreakerMatch.status) : true;
  const savedTiebreaker = entryData?.entry?.tiebreaker_total_maps ?? null;

  const dirty = useMemo(() => {
    if (!matches) return false;
    const pickDirty = matches.some(m => {
      if (isMatchLocked(m.start_time, m.status)) return false;
      const cur = pendingPicks[m.match_id];
      const saved = savedById[m.match_id]?.picked_team_id;
      return cur && cur !== saved;
    });
    const tbDirty = !!tiebreakerMatch && !tiebreakerLocked && pendingTiebreaker !== savedTiebreaker;
    return pickDirty || tbDirty;
  }, [pendingPicks, savedById, matches, pendingTiebreaker, savedTiebreaker, tiebreakerMatch, tiebreakerLocked]);

  const handlePick = (matchId: string, teamId: string) => {
    setPendingPicks(prev => ({ ...prev, [matchId]: teamId }));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save picks');
      return;
    }
    const tbId = slate?.tiebreaker_match_id ?? null;

    const payload = Object.entries(pendingPicks)
      .filter(([matchId, teamId]) => {
        const m = matches?.find(x => x.match_id === matchId);
        if (!m) return false;
        if (isMatchLocked(m.start_time, m.status)) return false;
        const pickChanged = savedById[matchId]?.picked_team_id !== teamId;
        const tbChangedHere = tbId === matchId && pendingTiebreaker !== savedTiebreaker;
        return pickChanged || tbChangedHere;
      })
      .map(([match_id, picked_team_id]) => ({
        match_id,
        picked_team_id,
        ...(tbId === match_id && pendingTiebreaker != null
          ? { tiebreaker_total_maps: pendingTiebreaker }
          : {}),
      }));

    if (payload.length === 0) {
      toast.info('No changes to save');
      return;
    }
    try {
      const res: any = await submit.mutateAsync(payload);
      const rejected = res?.rejected_locked?.length ?? 0;
      if (rejected > 0) {
        toast.warning(`Saved ${res.accepted} picks. ${rejected} were locked.`);
      } else {
        toast.success(`Saved ${res?.accepted ?? payload.length} picks`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save picks');
    }
  };

  const correct = entryData?.entry?.correct_picks ?? 0;
  const totalScored = entryData?.entry?.total_picks ?? 0;
  const score = entryData?.entry?.total_score ?? 0;
  const streakBonus = entryData?.entry?.streak_bonus ?? 0;
  const longestStreak = entryData?.entry?.longest_streak ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet>
        <title>{slate?.name ?? "Pick'em Slate"} | Frags & Fortunes</title>
      </Helmet>
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/pickems" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to slates
        </Link>

        {slateLoading || !slate ? (
          <Skeleton className="h-20 bg-slate-800/50 mb-4" />
        ) : (
          <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">
                {slate.name}
              </h1>
              {slate.tournament_name && (
                <p className="text-sm text-gray-400">{slate.tournament_name}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                1 pt per correct pick · +2 bonus per 3-in-a-row streak
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-400">Score · {correct}/{totalScored}</div>
                <div className="text-xl font-bold text-theme-purple flex items-center gap-1.5 justify-end">
                  {score}
                  {streakBonus > 0 && (
                    <span className="text-xs text-amber-400 inline-flex items-center gap-0.5">
                      <Flame className="h-3 w-3" /> +{streakBonus}
                    </span>
                  )}
                </div>
                {longestStreak >= 3 && (
                  <div className="text-[10px] text-amber-400/80">Best streak: {longestStreak}</div>
                )}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to={`/pickems/${slate.id}/leaderboard`}>
                  <BarChart3 className="h-4 w-4 mr-1" /> Leaderboard
                </Link>
              </Button>
            </div>
          </header>
        )}

        {matchesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 bg-slate-800/50" />
            ))}
          </div>
        ) : (matches ?? []).length === 0 ? (
          <p className="text-gray-400">No matches in this slate yet.</p>
        ) : (
          <>
            {(() => {
              const open = matches!.filter(m => !isMatchLocked(m.start_time, m.status));
              const locked = matches!.filter(m => isMatchLocked(m.start_time, m.status));
              const renderRow = (m: (typeof matches)[number]) => {
                const isTb = !!slate?.tiebreaker_match_id && m.match_id === slate.tiebreaker_match_id;
                return (
                  <PickemsMatchRow
                    key={m.match_id}
                    match={m}
                    pickedTeamId={pendingPicks[m.match_id] ?? null}
                    isCorrect={savedById[m.match_id]?.is_correct}
                    onPick={handlePick}
                    isTiebreaker={isTb}
                    tiebreakerValue={isTb ? pendingTiebreaker : null}
                    onTiebreakerChange={isTb ? (_id, v) => setPendingTiebreaker(v) : undefined}
                  />
                );
              };
              return (
                <div className="pb-24 space-y-6">
                  {open.length > 0 && (
                    <section>
                      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
                        Open for picks ({open.length})
                      </h2>
                      <div className="space-y-3">{open.map(renderRow)}</div>
                    </section>
                  )}
                  {locked.length > 0 && (
                    <section>
                      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Started / Finished ({locked.length})
                      </h2>
                      <div className="space-y-3 opacity-90">{locked.map(renderRow)}</div>
                    </section>
                  )}
                </div>
              );
            })()}

            {user ? (
              <div className="fixed bottom-4 left-0 right-0 px-4 z-30">
                <div className="container mx-auto max-w-3xl">
                  <Button
                    className="w-full bg-theme-purple hover:bg-theme-purple/90 h-12 shadow-lg"
                    disabled={!dirty || submit.isPending}
                    onClick={handleSave}
                  >
                    {submit.isPending ? 'Saving...' : dirty ? 'Save picks' : 'No changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="fixed bottom-4 left-0 right-0 px-4 z-30">
                <div className="container mx-auto max-w-3xl">
                  <Button asChild className="w-full bg-theme-purple hover:bg-theme-purple/90 h-12 shadow-lg">
                    <Link to="/auth">Sign in to save picks</Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PickemsSlatePage;
