import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Hero from '@/components/Hero';
import Footer from '@/components/Footer';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Users } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import SEOContentBlock from '@/components/SEOContentBlock';
import { Badge } from '@/components/ui/badge';
import { fetchSupabaseFaceitAllMatches, fetchSupabaseFaceitMatchesByDate, fetchSupabaseFaceitFinishedMatches } from '@/lib/supabaseFaceitApi';
import { FaceitSyncButtons } from '@/components/FaceitSyncButtons';
import { PandaScoreSyncButtons } from '@/components/PandaScoreSyncButtons';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import { formatMatchDate } from '@/utils/dateMatchUtils';
import { getDetailedMatchCountsByDate, getTotalMatchCountsByDate, MatchCountBreakdown } from '@/utils/matchCountUtils';
import { startOfDay, endOfDay, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

// Define the expected structure of SportDevs teams data
interface SportDevsTeamsData {
  team1: {
    id?: string;
    name: string;
    logo?: string;
  };
  team2: {
    id: string;
    name: string;
    logo?: string;
  };
}

// Define the expected structure of PandaScore teams data
interface PandaScoreTeamsData {
  team1: {
    id?: string;
    name: string;
    logo?: string;
  };
  team2: {
    id?: string;
    name: string;
    logo?: string;
  };
}

// 🔧 FIXED: Case-insensitive status categorization for FACEIT matches
const getFaceitStatusCategory = (status: string, matchId: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  console.log(`🔍 Categorizing match ${matchId} with status: ${status} (normalized: ${lowerStatus})`);
  
  // Live match statuses
  if (['ongoing', 'running', 'live'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as LIVE`);
    return 'live';
  }
  
  // Upcoming match statuses
  if (['upcoming', 'ready', 'scheduled', 'configured'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as UPCOMING`);
    return 'upcoming';
  }
  
  // Finished match statuses
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as FINISHED`);
    return 'finished';
  }
  
  console.log(`⚠️ Match ${matchId} status ${status} not recognized, returning null`);
  return null;
};

// Helper function to map SportDevs statuses to display categories
const getSportDevsStatusCategory = (status: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  // Live match statuses for SportDevs
  if (['live', 'running', 'ongoing'].includes(lowerStatus)) {
    return 'live';
  }
  
  // Upcoming match statuses for SportDevs
  if (['scheduled', 'upcoming', 'ready'].includes(lowerStatus)) {
    return 'upcoming';
  }
  
  // Finished match statuses for SportDevs
  if (['finished', 'completed', 'cancelled'].includes(lowerStatus)) {
    return 'finished';
  }
  
  return null;
};

// Helper function to map PandaScore statuses to display categories  
const getPandaScoreStatusCategory = (status: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  // Live match statuses for PandaScore
  if (['live', 'running', 'ongoing'].includes(lowerStatus)) {
    return 'live';
  }
  
  // Upcoming match statuses for PandaScore
  if (['scheduled', 'upcoming', 'ready', 'not_started'].includes(lowerStatus)) {
    return 'upcoming';
  }
  
  // Finished match statuses for PandaScore
  if (['finished', 'completed', 'cancelled'].includes(lowerStatus)) {
    return 'finished';
  }
  
  return null;
};

// Helper for grouping matches by tournament/league
function groupMatchesByLeague(matches: MatchInfo[]) {
  // Use tournament_name or tournament as group key
  return matches.reduce((acc: Record<string, MatchInfo[]>, match) => {
    const league =
      match.tournament_name ||
      match.tournament ||
      match.league_name ||
      'Unknown League';
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {});
}

const GAME_TYPE_OPTIONS = [
  { label: 'All Games', value: 'all' },
  { label: 'CS:GO / CS2', value: 'cs2' },
  { label: 'League of Legends', value: 'lol' },
  { label: 'Dota 2', value: 'dota2' },
  { label: 'Valorant', value: 'valorant' },
];

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [dateFilteredLiveMatches, setDateFilteredLiveMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredUpcomingMatches, setDateFilteredUpcomingMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredFinishedMatches, setDateFilteredFinishedMatches] = useState<MatchInfo[]>([]);
  const [allMatches, setAllMatches] = useState<MatchInfo[]>([]);
  const [loadingDateFiltered, setLoadingDateFiltered] = useState(true);
  const [loadingAllMatches, setLoadingAllMatches] = useState(true);
  const { toast } = useToast();
  
  // Check if selected date is today
  const isSelectedDateToday = isToday(selectedDate);
  
  // Updated unified match loading function to include finished PandaScore matches
  const loadAllMatchesFromDatabase = async (): Promise<MatchInfo[]> => {
    console.log('🔄 Loading matches from database (FACEIT + PandaScore including finished)...');
    
    // Fetch FACEIT matches with full data including status and results
    const faceitMatches = await fetchSupabaseFaceitAllMatches();
    console.log(`📊 Loaded ${faceitMatches.length} FACEIT matches from database`);
    
    // Debug: Log a sample FACEIT match to verify data structure
    if (faceitMatches.length > 0) {
      const sampleMatch = faceitMatches[0] as any;
      console.log('🔍 Sample FACEIT match data:', {
        id: sampleMatch.id,
        databaseMatchId: sampleMatch.databaseMatchId,
        status: sampleMatch.status,
        faceitData: sampleMatch.faceitData,
        hasResults: !!(sampleMatch.faceitData?.results)
      });
    }
    
    // 🔧 FIXED: FACEIT matches already have correct IDs from the API function
    console.log(`📊 FACEIT matches already have correct IDs for routing`);
    
    // Fetch PandaScore matches including finished ones
    const { data: pandascoreMatches, error: pandascoreError } = await supabase
      .from('pandascore_matches')
      .select('*')
      .in('status', ['scheduled', 'not_started', 'running', 'live', 'finished', 'completed'])
      .order('start_time', { ascending: true })
      .limit(200);

    if (pandascoreError) {
      console.error('Error loading PandaScore matches:', pandascoreError);
    }

    console.log(`📊 Loaded ${pandascoreMatches?.length || 0} PandaScore matches from database (including finished)`);
    
    // Transform PandaScore matches to MatchInfo format with consistent ID prefixing and correct team IDs
    const transformedPandaScore = (pandascoreMatches || []).map(match => {
      const teamsData = match.teams as unknown as PandaScoreTeamsData;
      const matchId = `pandascore_${match.match_id}`;
      
      console.log(`🔄 Homepage - PandaScore match transformed: ${match.match_id} -> ${matchId} (status: ${match.status})`);
      
      // 🔧 FIXED: Use actual team IDs from rawData with proper type casting
      const rawData = match.raw_data as any;
      const actualTeam1Id = rawData?.opponents?.[0]?.opponent?.id?.toString();
      const actualTeam2Id = rawData?.opponents?.[1]?.opponent?.id?.toString();
      
      console.log(`🎯 PandaScore team IDs - Team1: ${actualTeam1Id}, Team2: ${actualTeam2Id}`, {
        rawDataWinner: rawData?.winner?.id,
        rawDataResults: rawData?.results
      });
      
      return {
        id: matchId, // Ensure consistent prefixing for homepage
        teams: [
          {
            name: teamsData.team1?.name || 'TBD',
            logo: teamsData.team1?.logo || '/placeholder.svg',
            id: actualTeam1Id || `pandascore_team_${match.match_id}_1` // Use actual ID or fallback
          },
          {
            name: teamsData.team2?.name || 'TBD',
            logo: teamsData.team2?.logo || '/placeholder.svg',
            id: actualTeam2Id || `pandascore_team_${match.match_id}_2` // Use actual ID or fallback
          }
        ] as [any, any],
        startTime: match.start_time,
        tournament: match.tournament_name || match.league_name || 'Professional Tournament',
        esportType: match.esport_type,
        bestOf: match.number_of_games || 3,
        source: 'professional' as const,
        status: match.status, // Include status for proper categorization
        rawData: match.raw_data // 🔧 FIXED: Pass the complete rawData
      } satisfies MatchInfo;
    });

    const combinedMatches = [...faceitMatches, ...transformedPandaScore];
    console.log(`📊 Total unified dataset: ${combinedMatches.length} matches (${faceitMatches.length} FACEIT + ${transformedPandaScore.length} PandaScore including finished)`);
    
    return combinedMatches;
  };

  // Load all matches for counting (unified dataset)
  useEffect(() => {
    async function loadAllMatches() {
      setLoadingAllMatches(true);
      try {
        const combinedMatches = await loadAllMatchesFromDatabase();
        
        setAllMatches(combinedMatches);
        
        console.log('📊 Calendar counts updated from unified dataset');
      } catch (error) {
        console.error('Error loading all matches:', error);
        setAllMatches([]);
      } finally {
        setLoadingAllMatches(false);
      }
    }
    
    loadAllMatches();
  }, []);

  // Filtering function for game type
  const filterMatchesByGameType = (matches: MatchInfo[], gameType: string) => {
    if (gameType === 'all') return matches;
    // Normalize esport_type for both FACEIT and PandaScore
    // Faceit esportType: "cs2", "lol", "dota2", "valorant"
    // PandaScore esportType: "csgo", "cs2", "leagueoflegends", "dota2", "valorant"
    return matches.filter((match) => {
      const t = match.esportType?.toLowerCase?.() ?? '';
      if (gameType === 'cs2') {
        return t === 'csgo' || t === 'cs2';
      }
      if (gameType === 'lol') {
        return t === 'lol' || t === 'leagueoflegends';
      }
      return t === gameType;
    });
  };

  // Load date-filtered matches using the same unified dataset with enhanced logging and categorization
  useEffect(() => {
    async function loadDateFilteredMatches() {
      setLoadingDateFiltered(true);
      try {
        console.log('🗓️ Loading matches for selected date using unified dataset:', selectedDate.toDateString());
        
        const selectedDateStart = startOfDay(selectedDate);
        const selectedDateEnd = endOfDay(selectedDate);
        
        // Use the same unified dataset for consistency
        const combinedMatches = await loadAllMatchesFromDatabase();
        console.log(`📊 Loaded ${combinedMatches.length} total matches from unified dataset`);
        
        // Apply game type filter
        const filteredByGameType = filterMatchesByGameType(combinedMatches, selectedGameType);
        console.log(`📊 After game type filter (${selectedGameType}): ${filteredByGameType.length} matches`);
        
        // Filter matches by selected date
        const dateFilteredMatches = filteredByGameType.filter(match => {
          const matchDate = new Date(match.startTime);
          return matchDate >= selectedDateStart && matchDate <= selectedDateEnd;
        });
        
        console.log(`📊 Found ${dateFilteredMatches.length} matches for selected date from unified dataset`);

        // Enhanced categorization with detailed logging for both FACEIT and PandaScore
        const liveMatches: MatchInfo[] = [];
        const upcomingMatches: MatchInfo[] = [];
        const finishedMatches: MatchInfo[] = [];
        
        dateFilteredMatches.forEach(match => {
          console.log(`🔍 Processing match for categorization:`, {
            id: match.id,
            source: match.source,
            status: match.status,
            hasResults: !!(match.faceitData?.results),
            teams: match.teams?.map(t => t.name)
          });
          
          if (match.source === 'amateur') {
            // FACEIT match categorization with enhanced logging
            const statusCategory = getFaceitStatusCategory(match.status || '', match.id);
            
            console.log(`🎯 FACEIT match ${match.id} categorization result:`, {
              originalStatus: match.status,
              statusCategory,
              hasResults: !!(match.faceitData?.results)
            });
            
            if (statusCategory === 'live') {
              liveMatches.push(match);
              console.log(`➕ Added ${match.id} to LIVE matches`);
            } else if (statusCategory === 'finished') {
              finishedMatches.push(match);
              console.log(`➕ Added ${match.id} to FINISHED matches`);
            } else {
              upcomingMatches.push(match);
              console.log(`➕ Added ${match.id} to UPCOMING matches (fallback or upcoming status)`);
            }
          } else if (match.source === 'professional') {
            // PandaScore match categorization
            const statusCategory = getPandaScoreStatusCategory(match.status || '');
            
            console.log(`🎯 PandaScore match ${match.id} categorization result:`, {
              originalStatus: match.status,
              statusCategory
            });
            
            if (statusCategory === 'live') {
              liveMatches.push(match);
              console.log(`➕ Added PandaScore match ${match.id} to LIVE matches`);
            } else if (statusCategory === 'finished') {
              finishedMatches.push(match);
              console.log(`➕ Added PandaScore match ${match.id} to FINISHED matches`);
            } else {
              upcomingMatches.push(match);
              console.log(`➕ Added PandaScore match ${match.id} to UPCOMING matches`);
            }
          }
        });
        
        console.log(`📊 Final date-filtered categorization:`, {
          live: liveMatches.length,
          upcoming: upcomingMatches.length,
          finished: finishedMatches.length,
          liveMatchIds: liveMatches.map(m => m.id),
          upcomingMatchIds: upcomingMatches.map(m => m.id),
          finishedMatchIds: finishedMatches.map(m => m.id)
        });
        
        // Sort matches by start time
        const sortByStartTime = (a: MatchInfo, b: MatchInfo) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        
        setDateFilteredLiveMatches(liveMatches.sort(sortByStartTime));
        setDateFilteredUpcomingMatches(upcomingMatches.sort(sortByStartTime));
        setDateFilteredFinishedMatches(finishedMatches.sort(sortByStartTime));
      } catch (error) {
        console.error('Error loading date-filtered matches:', error);
        setDateFilteredLiveMatches([]);
        setDateFilteredUpcomingMatches([]);
        setDateFilteredFinishedMatches([]);
      } finally {
        setLoadingDateFiltered(false);
      }
    }
    
    loadDateFilteredMatches();
  }, [selectedDate, selectedGameType]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(startOfDay(date));
  };

  const handleGameTypeChange = (value: string) => {
    setSelectedGameType(value);
  };

  const homepageSEOContent = {
    title: "Your Ultimate Esports Betting & Stats Platform",
    paragraphs: [
      "Stay updated with live esports scores from major tournaments and competitions around the world. Our real-time esports match tracker provides second-by-second updates from your favorite games including CS:GO, League of Legends, Dota 2, and Valorant.",
      "Compare esports odds from leading betting sites in one convenient location. Find the best value for your bets with our comprehensive esports odds comparison tool featuring upcoming esports matches across all major titles.",
      "Explore in-depth team stats, performance analytics, and historical match results to inform your betting decisions. Our database tracks player performance, team rankings, and head-to-head statistics from all professional esports competitions.",
      "Whether you're following international championships or regional qualifiers, our platform provides all the information you need to stay ahead of the game with live coverage, match predictions, and expert analysis for the most competitive esports titles."
    ]
  };

  // NEW: Calculate match counts for the calendar based on filtered matches
  const filteredAllMatchesForCalendar = filterMatchesByGameType(allMatches, selectedGameType);
  const matchCounts = getTotalMatchCountsByDate(filteredAllMatchesForCalendar);
  const detailedMatchCounts = getDetailedMatchCountsByDate(filteredAllMatchesForCalendar);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark">
      <SearchableNavbar />
      <div className="flex-grow">
        <div className="w-full">
          {/* Unified Matches Section with Date Picker */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming flex items-center pl-2 md:pl-4">
                <Trophy className="h-6 w-6 mr-2 text-blue-400" />
                <span className="highlight-gradient">Esports</span> Matches
                <div className="flex gap-2 ml-3">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                    <Trophy size={12} className="mr-1" />
                    PRO
                  </Badge>
                  <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-400/30">
                    <Users size={12} className="mr-1" />
                    AMATEUR
                  </Badge>
                </div>
              </h2>
            </div>
            {/* GAME TYPE DROPDOWN FILTER */}
            <div className="max-w-xs mb-4 mx-2 md:mx-4">
              <Select value={selectedGameType} onValueChange={handleGameTypeChange}>
                <SelectTrigger
                  className="w-full font-semibold text-theme-purple border border-theme-purple/40 bg-theme-gray-dark focus:ring-2 focus:ring-theme-purple focus:border-theme-purple
                  transition duration-150 shadow-lg hover:bg-theme-gray rounded-md"
                >
                  <SelectValue
                    placeholder="Select Game"
                    className="text-theme-purple"
                  />
                </SelectTrigger>
                <SelectContent
                  className="bg-theme-gray-dark text-theme-purple border border-theme-purple/40 shadow-2xl rounded-lg z-50"
                >
                  {GAME_TYPE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="font-medium py-2 px-3 hover:bg-theme-purple/10 focus:bg-theme-purple/10 text-theme-purple data-[state=checked]:bg-theme-purple/30"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateMatchPicker
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              matchCounts={matchCounts}
              detailedMatchCounts={detailedMatchCounts}
            />

            {loadingDateFiltered ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
                <span>Loading matches for selected date...</span>
              </div>
            ) : (
              <>
                {/* Live Matches for Selected Date - Grouped by League */}
                {isSelectedDateToday && dateFilteredLiveMatches.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-green-400 mb-4 flex items-center">
                      🔴 Live Now ({dateFilteredLiveMatches.length})
                    </h4>
                    {Object.entries(groupMatchesByLeague(dateFilteredLiveMatches)).map(
                      ([league, matches]) => (
                        <div key={league} className="mb-6">
                          <div className="font-semibold text-sm text-theme-purple mb-2 ml-2 uppercase tracking-wide">
                            {league}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {matches.map(match => {
                              console.log(`🎮 Rendering LIVE MatchCard:`, {
                                id: match.id,
                                status: match.status,
                                hasResults: !!(match.faceitData?.results)
                              });
                              return (
                                <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                  <MatchCard match={match} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Upcoming Matches for Selected Date - Grouped by League */}
                {dateFilteredUpcomingMatches.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-blue-400 mb-4 flex items-center">
                      📅 Upcoming ({dateFilteredUpcomingMatches.length})
                    </h4>
                    {Object.entries(groupMatchesByLeague(dateFilteredUpcomingMatches)).map(
                      ([league, matches]) => (
                        <div key={league} className="mb-6">
                          <div className="font-semibold text-sm text-theme-purple mb-2 ml-2 uppercase tracking-wide">
                            {league}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {matches.map(match => {
                              console.log(`🎮 Rendering UPCOMING MatchCard:`, {
                                id: match.id,
                                status: match.status,
                                hasResults: !!(match.faceitData?.results)
                              });
                              return (
                                <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                  <MatchCard match={match} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Finished Matches for Selected Date - Grouped by League */}
                {dateFilteredFinishedMatches.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-green-400 mb-4 flex items-center">
                      ✅ Finished ({dateFilteredFinishedMatches.length})
                    </h4>
                    {Object.entries(groupMatchesByLeague(dateFilteredFinishedMatches)).map(
                      ([league, matches]) => (
                        <div key={league} className="mb-6">
                          <div className="font-semibold text-sm text-theme-purple mb-2 ml-2 uppercase tracking-wide">
                            {league}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {matches.map(match => {
                              console.log(`🎮 Rendering FINISHED MatchCard:`, {
                                id: match.id,
                                status: match.status,
                                hasResults: !!(match.faceitData?.results),
                                expectedRoute: `/faceit/finished/${match.id.replace('faceit_', '')}`
                              });
                              return (
                                <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                  <MatchCard match={match} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* No Matches State */}
                {((!isSelectedDateToday || dateFilteredLiveMatches.length === 0) && 
                  dateFilteredUpcomingMatches.length === 0 && 
                  dateFilteredFinishedMatches.length === 0) && (
                  <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                    <p className="text-gray-400 mb-4">No matches scheduled for {formatMatchDate(selectedDate)}.</p>
                    <p className="text-sm text-gray-500">
                      Try selecting a different date or use the sync buttons at the bottom to refresh match data.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* SEO Content Block */}
          <SEOContentBlock 
            title={homepageSEOContent.title}
            paragraphs={homepageSEOContent.paragraphs}
          />
        </div>
      </div>
      {/* Sync Buttons at the very bottom, above Footer */}
      <div className="w-full max-w-6xl mx-auto px-4 pb-8 flex flex-col md:flex-row gap-6 justify-center items-stretch">
        <div className="flex-1">
          <span className="block text-xs text-gray-400 mb-1 ml-1">FACEIT Sync</span>
          <FaceitSyncButtons />
        </div>
        <div className="flex-1">
          <span className="block text-xs text-gray-400 mb-1 ml-1">PandaScore Sync</span>
          <PandaScoreSyncButtons />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
