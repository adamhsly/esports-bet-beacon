import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useSlates, useUserSubmittedSlateIds } from '@/hooks/usePickems';
import { useAuth } from '@/contexts/AuthContext';
import { PickemsSlateCard, formatEsportLabel, getEsportPillClass } from '@/components/pickems/PickemsSlateCard';
import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PickemsPage: React.FC = () => {
  const { data: slates, isLoading } = useSlates();
  const { user } = useAuth();
  const { data: submittedIds } = useUserSubmittedSlateIds(user?.id);
  const [gameFilter, setGameFilter] = useState<string>('all');

  useEffect(() => {
    document.title = "Pick'ems | Frags & Fortunes";
  }, []);

  const active = useMemo(
    () => (slates ?? []).filter(s => s.status === 'published' || s.status === 'closed'),
    [slates]
  );
  const settled = useMemo(
    () => (slates ?? []).filter(s => s.status === 'settled'),
    [slates]
  );

  const gameOptions = useMemo(() => {
    const set = new Set<string>();
    active.forEach(s => s.esport_type && set.add(s.esport_type));
    return Array.from(set).sort();
  }, [active]);

  const filteredActive = useMemo(
    () => gameFilter === 'all' ? active : active.filter(s => s.esport_type === gameFilter),
    [active, gameFilter]
  );

  const { needsPicks, alreadyPicked } = useMemo(() => {
    const picked = submittedIds ?? new Set<string>();
    return {
      needsPicks: filteredActive.filter(s => !picked.has(s.id)),
      alreadyPicked: filteredActive.filter(s => picked.has(s.id)),
    };
  }, [filteredActive, submittedIds]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet>
        <title>Pick'ems | Frags & Fortunes</title>
        <meta name="description" content="Predict match winners across esports tournaments. 1 point per correct pick. Free to play." />
        <link rel="canonical" href="https://frags-and-fortunes.lovable.app/pickems" />
      </Helmet>
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-theme-purple" />
            Pick'ems
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Predict match winners. 1 point per correct pick. Lock in before each match starts.
          </p>
        </header>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 bg-slate-800/50" />
            ))}
          </div>
        ) : (
          <>
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-lg font-semibold">Active Slates</h2>
              </div>

              {gameOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGameFilter('all')}
                    className={cn(
                      'h-8 text-xs border-slate-700',
                      gameFilter === 'all'
                        ? 'bg-theme-purple text-white border-theme-purple hover:bg-theme-purple/90'
                        : 'bg-slate-800/60 text-gray-300 hover:bg-slate-700'
                    )}
                  >
                    All Games
                  </Button>
                  {gameOptions.map(g => {
                    const selected = gameFilter === g;
                    return (
                      <Button
                        key={g}
                        size="sm"
                        variant="outline"
                        onClick={() => setGameFilter(g)}
                        className={cn(
                          'h-8 text-xs border',
                          getEsportPillClass(g),
                          selected ? 'ring-1 ring-current font-semibold' : 'opacity-70 hover:opacity-100'
                        )}
                      >
                        {formatEsportLabel(g)}
                      </Button>
                    );
                  })}
                </div>
              )}

              {filteredActive.length === 0 ? (
                <p className="text-gray-400 text-sm">No active slates for this filter.</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                      Awaiting Your Picks
                      <span className="ml-2 text-xs text-gray-500 normal-case font-normal">
                        ({needsPicks.length})
                      </span>
                    </h3>
                    {needsPicks.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">All caught up — picks submitted for every active slate.</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {needsPicks.map(s => <PickemsSlateCard key={s.id} slate={s} hasPicks={false} />)}
                      </div>
                    )}
                  </div>

                  {alreadyPicked.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-300 mb-2 uppercase tracking-wide">
                        Already Picked
                        <span className="ml-2 text-xs text-gray-500 normal-case font-normal">
                          ({alreadyPicked.length})
                        </span>
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {alreadyPicked.map(s => <PickemsSlateCard key={s.id} slate={s} hasPicks />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {settled.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Past Slates</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {settled.map(s => <PickemsSlateCard key={s.id} slate={s} hasPicks={submittedIds?.has(s.id)} />)}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PickemsPage;
