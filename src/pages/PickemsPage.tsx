import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useSlates, useUserSubmittedSlateIds } from '@/hooks/usePickems';
import { useAuth } from '@/contexts/AuthContext';
import { PickemsSlateCard, formatEsportLabel, getEsportPillClass } from '@/components/pickems/PickemsSlateCard';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Esports logos (same set used by EsportsLogoFilter on the score page)
import counterStrike2Logo from '@/assets/logos/esports/counter-strike-2.png';
import leagueOfLegendsLogo from '@/assets/logos/esports/league-of-legends.png';
import dota2Logo from '@/assets/logos/esports/dota-2.png';
import valorantLogo from '@/assets/logos/esports/valorant.png';
import rainbowSixSiegeLogo from '@/assets/logos/esports/rainbow-six-siege.png';
import rocketLeagueLogo from '@/assets/logos/esports/rocket-league.png';
import starcraft2Logo from '@/assets/logos/esports/starcraft-2.png';
import overwatchLogo from '@/assets/logos/esports/overwatch.png';
import honorOfKingsLogo from '@/assets/logos/esports/honor-of-kings.png';
import mobileLegendsLogo from '@/assets/logos/esports/mobile-legends.png';

const GAME_TILES: { value: string; label: string; logo: string; aliases?: string[] }[] = [
  { value: 'counter-strike', label: 'Counter-Strike 2', logo: counterStrike2Logo, aliases: ['cs-go', 'cs2'] },
  { value: 'lol', label: 'League of Legends', logo: leagueOfLegendsLogo, aliases: ['league-of-legends'] },
  { value: 'dota2', label: 'Dota 2', logo: dota2Logo, aliases: ['dota-2'] },
  { value: 'valorant', label: 'Valorant', logo: valorantLogo },
  { value: 'rainbow-6-siege', label: 'Rainbow Six Siege', logo: rainbowSixSiegeLogo },
  { value: 'rocket-league', label: 'Rocket League', logo: rocketLeagueLogo },
  { value: 'starcraft-2', label: 'StarCraft 2', logo: starcraft2Logo },
  { value: 'overwatch', label: 'Overwatch', logo: overwatchLogo },
  { value: 'king-of-glory', label: 'Honor of Kings', logo: honorOfKingsLogo },
  { value: 'mobile-legends', label: 'Mobile Legends', logo: mobileLegendsLogo },
];

const matchesGame = (esport: string | null | undefined, selected: string) => {
  if (!esport) return false;
  if (esport === selected) return true;
  const tile = GAME_TILES.find(t => t.value === selected);
  return tile?.aliases?.includes(esport) ?? false;
};

const PickemsPage: React.FC = () => {
  const { data: slates, isLoading } = useSlates();
  const { user } = useAuth();
  const { data: submittedIds } = useUserSubmittedSlateIds(user?.id);
  const [gameFilter, setGameFilter] = useState<string | null>(null);

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

  // Count active slates per game tile for the landing screen
  const slateCountsByGame = useMemo(() => {
    const counts: Record<string, number> = {};
    GAME_TILES.forEach(tile => {
      counts[tile.value] = active.filter(s => matchesGame(s.esport_type, tile.value)).length;
    });
    return counts;
  }, [active]);

  const filteredActive = useMemo(
    () => gameFilter ? active.filter(s => matchesGame(s.esport_type, gameFilter)) : active,
    [active, gameFilter]
  );

  const filteredSettled = useMemo(
    () => gameFilter ? settled.filter(s => matchesGame(s.esport_type, gameFilter)) : settled,
    [settled, gameFilter]
  );

  const { needsPicks, alreadyPicked } = useMemo(() => {
    const picked = submittedIds ?? new Set<string>();
    return {
      needsPicks: filteredActive.filter(s => !picked.has(s.id)),
      alreadyPicked: filteredActive.filter(s => picked.has(s.id)),
    };
  }, [filteredActive, submittedIds]);

  const selectedTile = gameFilter ? GAME_TILES.find(t => t.value === gameFilter) : null;

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

        {/* Game-type landing screen */}
        {!gameFilter ? (
          <section>
            <h2 className="text-lg font-semibold mb-2">Pick a game to get started</h2>
            <p className="text-gray-400 text-sm mb-5">
              Choose which esport you want to predict. We'll show you all open slates for that game.
            </p>

            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 bg-slate-800/50 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {GAME_TILES.map(tile => {
                  const count = slateCountsByGame[tile.value] ?? 0;
                  const disabled = count === 0;
                  return (
                    <button
                      key={tile.value}
                      onClick={() => !disabled && setGameFilter(tile.value)}
                      disabled={disabled}
                      className={cn(
                        'group relative flex flex-col items-center justify-center gap-2 p-3',
                        'rounded-xl transition-all duration-[250ms] ease-in-out',
                        'h-32 lg:h-36',
                        'bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28]',
                        'shadow-[0_4px_15px_rgba(0,0,0,0.4)]',
                        'border-2 border-transparent',
                        'before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none',
                        'focus:outline-none touch-manipulation select-none',
                        disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:translate-y-[-3px] hover:scale-[1.02] hover:border-[#965AFF] hover:shadow-[0_0_20px_rgba(150,90,255,0.4),0_4px_15px_rgba(0,0,0,0.4)]'
                      )}
                      aria-label={`Show ${tile.label} slates`}
                      title={tile.label}
                    >
                      <img
                        src={tile.logo}
                        alt={tile.label}
                        className="w-16 h-16 object-contain"
                        draggable={false}
                      />
                      <span className="text-[11px] font-medium text-[#E8EAF5] text-center leading-tight line-clamp-2">
                        {tile.label}
                      </span>
                      {count > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-theme-purple text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {!isLoading && active.length === 0 && (
              <p className="text-gray-500 text-sm italic mt-6 text-center">
                No active slates right now — check back soon.
              </p>
            )}
          </section>
        ) : (
          <>
            {/* Back / current-game header */}
            <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGameFilter(null)}
                className="h-8 text-gray-300 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                All games
              </Button>
              {selectedTile && (
                <div className="flex items-center gap-2">
                  <img src={selectedTile.logo} alt="" className="w-7 h-7 object-contain" />
                  <span className={cn('text-xs px-2 py-1 rounded border', getEsportPillClass(gameFilter))}>
                    {formatEsportLabel(gameFilter)}
                  </span>
                </div>
              )}
            </div>

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

                  {filteredActive.length === 0 ? (
                    <p className="text-gray-400 text-sm">No active slates for this game yet.</p>
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

                {filteredSettled.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold mb-3">Past Slates</h2>
                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredSettled.map(s => <PickemsSlateCard key={s.id} slate={s} hasPicks={submittedIds?.has(s.id)} />)}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PickemsPage;
