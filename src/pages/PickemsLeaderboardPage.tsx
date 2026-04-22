import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useSlate, useLeaderboard } from '@/hooks/usePickems';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const PickemsLeaderboardPage: React.FC = () => {
  const { slateId } = useParams<{ slateId: string }>();
  const { data: slate } = useSlate(slateId);
  const { data: rows, isLoading } = useLeaderboard(slateId);
  const [profileMap, setProfileMap] = useState<Record<string, { username: string | null; avatar_url: string | null }>>({});

  useEffect(() => {
    const ids = (rows ?? []).map(r => r.user_id);
    if (ids.length === 0) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', ids);
      const m: Record<string, { username: string | null; avatar_url: string | null }> = {};
      (data ?? []).forEach((p: any) => { m[p.user_id] = { username: p.username, avatar_url: p.avatar_url }; });
      setProfileMap(m);
    })();
  }, [rows]);

  const tiebreakerActual = rows?.find(r => r.tiebreaker_actual != null)?.tiebreaker_actual ?? null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet>
        <title>{slate?.name ? `${slate.name} Leaderboard` : "Pick'em Leaderboard"} | Frags & Fortunes</title>
      </Helmet>
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-4 flex">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800/60 text-gray-200 hover:bg-slate-700 hover:text-white"
          >
            <Link to={slateId ? `/pickems/${slateId}` : '/pickems'}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to slate
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold mb-1">
          {slate?.name ?? "Pick'em"} — Leaderboard
        </h1>
        <p className="text-xs text-gray-500 mb-4">
          Ranked by score, then closest tiebreaker prediction
          {tiebreakerActual != null && <> · actual maps: <span className="text-amber-400">{tiebreakerActual}</span></>}
        </p>

        {isLoading ? (
          <Skeleton className="h-64 bg-slate-800/50" />
        ) : (rows ?? []).length === 0 ? (
          <p className="text-gray-400">No entries yet. Be the first to pick!</p>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 text-xs text-gray-400 border-b border-slate-700">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Player</div>
              <div className="col-span-2 text-right">Correct</div>
              <div className="col-span-2 text-right">TB Δ</div>
              <div className="col-span-2 text-right">Score</div>
            </div>
            {rows!.map((r, i) => {
              const p = profileMap[r.user_id];
              const streak = r.streak_bonus ?? 0;
              return (
                <div key={r.id} className="grid grid-cols-12 gap-2 p-3 text-sm border-b border-slate-800 last:border-0">
                  <div className="col-span-1 text-gray-400">{i + 1}</div>
                  <div className="col-span-5 flex items-center gap-2 truncate">
                    {p?.avatar_url && <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-full" />}
                    <span className="truncate">{p?.username ?? 'Anonymous'}</span>
                  </div>
                  <div className="col-span-2 text-right text-gray-300">{r.correct_picks}/{r.total_picks}</div>
                  <div className="col-span-2 text-right text-gray-400">
                    {r.tiebreaker_delta != null ? r.tiebreaker_delta : r.tiebreaker_total_maps != null ? '—' : ''}
                  </div>
                  <div className="col-span-2 text-right font-semibold text-theme-purple flex items-center justify-end gap-1">
                    {r.total_score}
                    {streak > 0 && (
                      <span className="text-[10px] text-amber-400 inline-flex items-center">
                        <Flame className="h-2.5 w-2.5" />+{streak}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PickemsLeaderboardPage;
