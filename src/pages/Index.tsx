import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Trophy } from 'lucide-react';

import Hero from '@/components/Hero';
import Footer from '@/components/Footer';
import SearchableNavbar from '@/components/SearchableNavbar';
import SEOContentBlock from '@/components/SEOContentBlock';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import { FilterPills } from '@/components/FilterPills';
import { EsportsLogoFilter } from '@/components/EsportsLogoFilter';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import LiveDataTestPanel from '@/components/LiveDataTestPanel';

import { useToast } from '@/hooks/use-toast';
import { formatMatchDate } from '@/utils/dateMatchUtils';
import { MatchCountBreakdown } from '@/utils/matchCountUtils';
import { startOfDay, isToday } from 'date-fns';
import { isDateInRange } from '@/utils/timezoneUtils';

import { getDayCounts, getMatchesForDate } from '@/lib/supabaseMatchFunctions';

// ---- status mapping helpers (unchanged logic) ----
const getFaceitStatusCategory = (
  status: string,
  matchId: string,
  startTime?: string
): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status?.toLowerCase?.() || '';
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(lowerStatus)) return 'finished';
  if (['ongoing', 'running', 'live'].includes(lowerStatus)) return 'live';
  if (['upcoming', 'ready', 'scheduled', 'configured'].includes(lowerStatus)) return 'upcoming';
  return null;
};

const getPandaScoreStatusCategory = (
  status: string,
  startTime?: string
): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status?.toLowerCase?.() || '';
  if (['finished', 'completed', 'cancelled', 'canceled', 'postponed', 'forfeit'].includes(lowerStatus)) return 'finished';
  if (['live', 'running', 'ongoing'].includes(lowerStatus)) return 'live';
  if (['scheduled', 'upcoming', 'ready', 'not_started'].includes(lowerStatus)) return 'upcoming';
  return null;
};

// ---- tournament helpers (unchanged) ----
const generateTournamentId = (match: MatchInfo) => {
  if (match.source === 'professional' && match.rawData) {
    const rawData: any = match.rawData;
    if (rawData.tournament?.id) return `pandascore_${rawData.tournament.id}`;
    if (rawData.league?.id) return `pandascore_${rawData.league.id}`;
  }
  if (match.source === 'amateur') {
    const competitionName = match.tournament;
    if (competitionName && competitionName !== 'Matchmaking') {
      return `faceit_${competitionName.replace(/\s+/g, '_').toLowerCase()}`;
    }
  }
  const validTournamentIds = [
    'pandascore_16836',
    'pandascore_16673',
    'pandascore_16652',
    'pandascore_16651',
    'pandascore_16650',
    'pandascore_16649',
    'faceit_faceit_championship_series',
    'faceit_premier_league',
  ];
  return validTournamentIds[Math.floor(Math.random() * validTournamentIds.length)];
};

function groupMatchesByLeague(matches: MatchInfo[]) {
  return matches.reduce(
    (
      acc: Record<
        string,
        {
          matches: MatchInfo[];
          tournamentId?: string;
        }
      >,
      match
    ) => {
      let league: string;
      if (match.source === 'professional' && match.league_name && match.tournament_name) {
        league = `${match.league_name} - ${match.tournament_name}`;
      } else {
        league = match.tournament_name || match.tournament || match.league_name || 'Unknown League';
      }
      if (!acc[league]) {
        acc[league] = { matches: [], tournamentId: generateTournamentId(match) };
      }
      acc[league].matches.push(match);
      return acc;
    },
    {}
  );
}

// ---- page component ----
const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');

  const [dateFilteredLiveMatches, setDateFilteredLiveMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredUpcomingMatches, setDateFilteredUpcomingMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredFinishedMatches, setDateFilteredFinishedMatches] = useState<MatchInfo[]>([]);

  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [detailedMatchCounts, setDetailedMatchCounts] = useState<Record<string, MatchCountBreakdown>>({});

  const [loadingDateFiltered, setLoadingDateFiltered] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const { toast } = useToast();
  const isSelectedDateToday = isToday(selectedDate);

  // ---- filtering helpers (kept as-is to preserve UX) ----
  const filterMatchesByGameType = (matches: MatchInfo[], gameType: string) => {
    if (gameType === 'all') return matches;
    return matches.filter((match) => {
      const esportType = match.esportType?.toLowerCase?.() ?? '';
      const original = match.esportType ?? '';
      const map: Record<string, () => boolean> = {
        'counter-strike': () =>
          ['csgo', 'cs2', 'cs', 'counter-strike', 'counterstrike'].includes(esportType) ||
          esportType.includes('counter') ||
          original === 'Counter-Strike',
        lol: () =>
          ['lol', 'leagueoflegends', 'league-of-legends', 'league of legends'].includes(esportType) ||
          esportType.includes('league') ||
          original === 'LoL',
        valorant: () => ['valorant', 'val'].includes(esportType) || original === 'Valorant',
        dota2: () => ['dota2', 'dota', 'dota-2', 'dota 2'].includes(esportType) || esportType.includes('dota') || original === 'Dota 2',
        'ea-sports-fc': () =>
          ['ea sports fc', 'easportsfc', 'fifa', 'football', 'soccer'].includes(esportType) || original === 'EA Sports FC',
        'rainbow-6-siege': () =>
          ['rainbow 6 siege', 'rainbow6siege', 'r6', 'siege'].includes(esportType) || original === 'Rainbow 6 Siege',
        'rocket-league': () => ['rocket league', 'rocketleague', 'rl'].includes(esportType) || original === 'Rocket League',
        'starcraft-2': () => ['starcraft 2', 'starcraft2', 'sc2'].includes(esportType) || original === 'StarCraft 2',
        overwatch: () => ['overwatch', 'ow'].includes(esportType) || original === 'Overwatch',
        'king-of-glory': () => ['king of glory', 'kingofglory', 'kog'].includes(esportType) || original === 'King of Glory',
        'call-of-duty': () => ['call of duty', 'callofduty', 'cod'].includes(esportType) || original === 'Call of Duty',
        'lol-wild-rift': () =>
          ['lol wild rift', 'lolwildrift', 'wild rift', 'wildrift'].includes(esportType) || original === 'LoL Wild Rift',
        pubg: () => ['pubg', "playerunknowns battlegrounds"].includes(esportType) || original === 'PUBG',
        'mobile-legends': () =>
          ['mobile legends: bang bang', 'mobile legends', 'mobilelegends', 'ml', 'mlbb'].includes(esportType) ||
          original === 'Mobile Legends: Bang Bang',
      };
      const fn = map[gameType];
      if (fn) return fn();
      return esportType === gameType || original.toLowerCase() === gameType;
    });
  };

  const applyAllFilters = (matches: MatchInfo[]) => {
    // remove cancelled/aborted at client too (extra safety)
    const withoutCancelled = matches.filter((m) => {
      const s = (m.status || '').toLowerCase();
      return !s.startsWith('cancel') && !s.startsWith('abort');
    });

    let filtered = filterMatchesByGameType(withoutCancelled, selectedGameType);

    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter((match) => {
        const statusCategory =
          match.source === 'amateur'
            ? getFaceitStatusCategory(match.status || '', match.id, match.startTime)
            : getPandaScoreStatusCategory(match.status || '', match.startTime);
        return statusCategory === selectedStatusFilter;
      });
    }

    if (selectedSourceFilter !== 'all') {
      filtered = filtered.filter((match) => match.source === selectedSourceFilter);
    }

    return filtered;
  };

  // ---- EFFECT: load calendar counts from MV (fast) ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCalendar(true);
      try {
        const rows = await getDayCounts(selectedDate, 7);
        // rows: [{ match_date, source, match_count }]
        const totals: Record<string, number> = {};
        const detailed: Record<string, { faceit: number; pandascore: number }> = {};

        for (const r of rows as any[]) {
          const day = r.match_date;
          totals[day] = (totals[day] ?? 0) + Number(r.match_count || 0);
          if (!detailed[day]) detailed[day] = { faceit: 0, pandascore: 0 };
          if (r.source === 'faceit') detailed[day].faceit += Number(r.match_count || 0);
          if (r.source === 'pandascore') detailed[day].pandascore += Number(r.match_count || 0);
        }

        if (!cancelled) {
          setMatchCounts(totals);
          // adapt to MatchCountBreakdown if needed by your component
          const breakdown: Record<string, MatchCountBreakdown> = {};
          for (const [day, v] of Object.entries(detailed)) {
            breakdown[day] = {
              faceit: v.faceit,
              pandascore: v.pandascore,
            } as any;
          }
          setDetailedMatchCounts(breakdown);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Calendar counts error', err);
          setMatchCounts({});
          setDetailedMatchCounts({});
        }
      } finally {
        if (!cancelled) setLoadingCalendar(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedGameType]); // keep dependency to preserve current UX

  // ---- EFFECT: load matches for one day from the lightweight view ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDateFiltered(true);
      try {
        const sourceParam =
          selectedSourceFilter === 'all' ? 'all' : (selectedSourceFilter as 'amateur' | 'professional');

        const matches = await getMatchesForDate({
          date: selectedDate,
          limit: 200, // adjust if needed
          source: sourceParam,
          esportType: selectedGameType,
        });

        // apply client-side filters (status/source already mostly handled, but keep for UX parity)
        const filtered = applyAllFilters(matches);

        // ensure they belong to the selected day (defensive)
        const dateFilteredMatches = filtered.filter((m) => isDateInRange(m.startTime, selectedDate));

        // split by status category (unchanged UX)
        const live: MatchInfo[] = [];
        const upcoming: MatchInfo[] = [];
        const finished: MatchInfo[] = [];

        for (const match of dateFilteredMatches) {
          const cat =
            match.source === 'amateur'
              ? getFaceitStatusCategory(match.status || '', match.id, match.startTime)
              : getPandaScoreStatusCategory(match.status || '', match.startTime);
          if (cat === 'live') live.push(match);
          else if (cat === 'finished') finished.push(match);
          else upcoming.push(match);
        }

        const byTime = (a: MatchInfo, b: MatchInfo) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

        if (!cancelled) {
          setDateFilteredLiveMatches(live.sort(byTime));
          setDateFilteredUpcomingMatches(upcoming.sort(byTime));
          setDateFilteredFinishedMatches(finished.sort(byTime));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Date matches error', err);
          setDateFilteredLiveMatches([]);
          setDateFilteredUpcomingMatches([]);
          setDateFilteredFinishedMatches([]);
        }
      } finally {
        if (!cancelled) setLoadingDateFiltered(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedGameType, selectedStatusFilter, selectedSourceFilter]);

  // ---- handlers (unchanged) ----
  const handleDateSelect = (date: Date | undefined) => {
    if (date) setSelectedDate(startOfDay(date));
  };
  const handleGameTypeChange = (value: string) => setSelectedGameType(value);
  const handleStatusFilterChange = (value: string) => setSelectedStatusFilter(value);
  const handleSourceFilterChange = (value: string) => setSelectedSourceFilter(value);

  // ---- tournament metadata helpers (unchanged UI) ----
  const formatPrizePool = (prizePool: number | string) => {
    if (!prizePool) return null;
    const amount = typeof prizePool === 'string' ? parseInt(prizePool) : prizePool;
    if (isNaN(amount) || amount <= 0) return null;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const getPrizeValueFromMetadata = (metadata: any): number | null => {
    if (!metadata || metadata.prizePool == null) return null;
    const raw = metadata.prizePool;
    const val = typeof raw === 'string' ? parseInt(raw) : Number(raw);
    return Number.isFinite(val) && val > 0 ? val : null;
    };

  const getTierValueFromMetadata = (metadata: any): number => {
    if (!metadata || !metadata.tier) return 999;
    const t = String(metadata.tier).toLowerCase();
    if (t === 's') return -1;
    if (t === 'a') return 0;
    if (t === 'b') return 1;
    if (t === 'c') return 2;
    if (t === 'd') return 3;
    return 999;
  };

  const getTournamentMetadata = (matches: MatchInfo[]) => {
    if (matches.length === 0) return null;
    const sample = matches[0];
    let meta: any = {};
    if (sample.source === 'professional' && sample.rawData) {
      const raw: any = sample.rawData;
      if (raw.tournament) {
        meta.prizePool = raw.tournament.prizepool;
        meta.tier = raw.tournament.tier;
      }
      if (raw.league) {
        meta.prizePool = meta.prizePool || raw.league.prizepool;
        meta.tier = meta.tier || raw.league.tier;
      }
      if (raw.serie) {
        meta.serieInfo = {
          fullName: raw.serie.full_name,
          year: raw.serie.year,
          season: raw.serie.season,
        };
      }
    }
    if (sample.source === 'amateur' && (sample as any).faceitData) {
      const fd: any = (sample as any).faceitData;
      meta.region = fd.region;
      meta.competitionType = fd.competitionType;
      meta.organizedBy = fd.organizedBy;
    }
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const renderTournamentMetadata = (metadata: any) => {
    if (!metadata) return null;
    const items: React.ReactNode[] = [];
    if (metadata.prizePool) {
      const formatted = formatPrizePool(metadata.prizePool);
      if (formatted) items.push(
        <span key="prize" className="flex items-center gap-1 text-xs text-green-400 font-medium">
          <Trophy size={12} />
          {formatted}
        </span>
      );
    }
    if (metadata.tier && metadata.tier !== 'unranked') {
      items.push(<span key="tier" className="text-xs text-blue-400 font-medium uppercase">{metadata.tier}</span>);
    }
    if (metadata.serieInfo) {
      const { year, season } = metadata.serieInfo;
      items.push(<span key="serie" className="text-xs text-purple-400 font-medium">{year && season ? `${year} ${season}` : year || season}</span>);
    }
    if (metadata.region) items.push(<span key="region" className="text-xs text-orange-400 font-medium uppercase">{metadata.region}</span>);
    if (metadata.competitionType && metadata.competitionType !== 'Matchmaking') {
      items.push(<span key="compType" className="text-xs text-yellow-400 font-medium">{metadata.competitionType}</span>);
    }
    return items.length > 0 ? <div className="flex items-center justify-center gap-2 ml-2 mt-1">{items}</div> : null;
  };

  // ---- memoized groupings (same output, less work) ----
  const groupedLive = useMemo(() => groupMatchesByLeague(dateFilteredLiveMatches), [dateFilteredLiveMatches]);
  const groupedUpcoming = useMemo(() => groupMatchesByLeague(dateFilteredUpcomingMatches), [dateFilteredUpcomingMatches]);
  const groupedFinished = useMemo(() => groupMatchesByLeague(dateFilteredFinishedMatches), [dateFilteredFinishedMatches]);

  const homepageSEOContent = {
    title: 'Your Ultimate Esports Betting & Stats Platform',
    paragraphs: [
      'Stay updated with live esports scores from major tournaments and competitions around the world. Our real-time esports match tracker provides second-by-second updates from your favorite games including CS:GO, League of Legends, Dota 2, and Valorant.',
      'Compare esports odds from leading betting sites in one convenient location. Find the best value for your bets with our comprehensive esports odds comparison tool featuring upcoming esports matches across all major titles.',
      'Explore in-depth team stats, performance analytics, and historical match results to inform your betting decisions. Our database tracks player performance, team rankings, and head-to-head statistics from all professional esports competitions.',
      "Whether you're following international championships or regional qualifiers, our platform provides all the information you need to stay ahead of the game with live coverage, match predictions, and expert analysis for the most competitive esports titles.",
    ],
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark">
      <SearchableNavbar />
      <div className="flex-grow">
        <div className="w-full">
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-8 mx-2 md:mx-4">
              <LiveDataTestPanel />
            </div>
          )}

          <div className="mb-12">
            {/* ESPORTS LOGO FILTER BAR */}
            <div className="mx-2 md:mx-4">
              <EsportsLogoFilter
                selectedGameType={selectedGameType}
                onGameTypeChange={setSelectedGameType}
              />
            </div>

            {/* FILTER PILLS */}
            <div className="mx-2 md:mx-4">
              <div className="flex flex-wrap items-center gap-2 mb-6 px-4 py-1">
                <FilterPills
                  gameType={selectedGameType}
                  statusFilter={selectedStatusFilter}
                  sourceFilter={selectedSourceFilter}
                  onGameTypeChange={setSelectedGameType}
                  onStatusFilterChange={setSelectedStatusFilter}
                  onSourceFilterChange={setSelectedSourceFilter}
                />
              </div>
            </div>

            {/* HORIZONTAL DAY SELECTOR */}
            {!loadingCalendar && (
              <div className="mx-2 md:mx-4">
                <DateMatchPicker
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  matchCounts={matchCounts}
                  detailedMatchCounts={detailedMatchCounts}
                />
              </div>
            )}

            {/* Fantasy Banner */}
            <div className="mx-2 md:mx-4 mb-8">
              <div className="max-w-4xl mx-auto">
                <Link to="/fantasy" className="block hover:opacity-90 transition-opacity">
                  <img
                    src="/lovable-uploads/863ef2a8-193d-4c0b-a0f7-99b17420fb6a.png"
                    alt="Build Your Dream Team - Fantasy Arena"
                    className="w-full max-w-xl h-auto rounded-lg cursor-pointer mx-auto"
                  />
                </Link>
              </div>
            </div>

            {loadingDateFiltered ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
                <span className="text-primary-foreground">Loading matches for selected date...</span>
              </div>
            ) : (
              <>
                {/* Live */}
                {isSelectedDateToday && Object.keys(groupedLive).length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupedLive)
                      .map(([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        const prizeValue = getPrizeValueFromMetadata(metadata);
                        const tierValue = getTierValueFromMetadata(metadata);
                        return { league, matches, tournamentId, metadata, prizeValue, tierValue };
                      })
                      .sort((a, b) => (a.tierValue !== b.tierValue ? a.tierValue - b.tierValue : (b.prizeValue ?? -1) - (a.prizeValue ?? -1)))
                      .map(({ league, matches, tournamentId, metadata }) => (
                        <div key={league} className="mb-6">
                          <div className="px-2 sm:px-4 lg:px-6 ml-3 mb-2">
                            {tournamentId ? (
                              <Link to={`/tournament/${tournamentId}`} className="hover:text-theme-purple transition-colors">
                                <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide hover:underline cursor-pointer">
                                  {league}
                                </div>
                              </Link>
                            ) : (
                              <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">{league}</div>
                            )}
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                            {matches.map((match) => (
                              <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                <MatchCard match={match} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Upcoming */}
                {Object.keys(groupedUpcoming).length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupedUpcoming)
                      .map(([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        const prizeValue = getPrizeValueFromMetadata(metadata);
                        const tierValue = getTierValueFromMetadata(metadata);
                        return { league, matches, tournamentId, metadata, prizeValue, tierValue };
                      })
                      .sort((a, b) => (a.tierValue !== b.tierValue ? a.tierValue - b.tierValue : (b.prizeValue ?? -1) - (a.prizeValue ?? -1)))
                      .map(({ league, matches, tournamentId, metadata }) => (
                        <div key={league} className="mb-6">
                          <div className="px-2 sm:px-4 lg:px-6 ml-3 mb-2">
                            {tournamentId ? (
                              <Link to={`/tournament/${tournamentId}`} className="hover:text-theme-purple transition-colors">
                                <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide hover:underline cursor-pointer">
                                  {league}
                                </div>
                              </Link>
                            ) : (
                              <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">{league}</div>
                            )}
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                            {matches.map((match) => (
                              <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                <MatchCard match={match} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Finished */}
                {Object.keys(groupedFinished).length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupedFinished)
                      .map(([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        const prizeValue = getPrizeValueFromMetadata(metadata);
                        const tierValue = getTierValueFromMetadata(metadata);
                        return { league, matches, tournamentId, metadata, prizeValue, tierValue };
                      })
                      .sort((a, b) => (a.tierValue !== b.tierValue ? a.tierValue - b.tierValue : (b.prizeValue ?? -1) - (a.prizeValue ?? -1)))
                      .map(({ league, matches, tournamentId, metadata }) => (
                        <div key={league} className="mb-6">
                          <div className="px-2 sm:px-4 lg:px-6 ml-3 mb-2">
                            {tournamentId ? (
                              <Link to={`/tournament/${tournamentId}`} className="hover:text-theme-purple transition-colors">
                                <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide hover:underline cursor-pointer">
                                  {league}
                                </div>
                              </Link>
                            ) : (
                              <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">{league}</div>
                            )}
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                            {matches.map((match) => (
                              <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                <MatchCard match={match} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* No matches */}
                {(!isSelectedDateToday || dateFilteredLiveMatches.length === 0) &&
                  dateFilteredUpcomingMatches.length === 0 &&
                  dateFilteredFinishedMatches.length === 0 && (
                    <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                      <p className="text-gray-400 mb-4">No matches scheduled for {formatMatchDate(selectedDate)}.</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Try selecting a different date or use the sync buttons below to refresh match data.
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>

          {/* SEO Content Block */}
          <SEOContentBlock title={homepageSEOContent.title} paragraphs={homepageSEOContent.paragraphs} />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
