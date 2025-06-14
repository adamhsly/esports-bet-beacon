import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Hero from '@/components/Hero';
import FeaturedGames from '@/components/FeaturedGames';
import TopBettingSites from '@/components/TopBettingSites';
import PromoBanner from '@/components/PromoBanner';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import EsportsNavigation from '@/components/EsportsNavigation';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, Trophy, Users } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import SEOContentBlock from '@/components/SEOContentBlock';
import { Badge } from '@/components/ui/badge';
import { fetchSupabaseFaceitAllMatches, fetchSupabaseFaceitMatchesByDate } from '@/lib/supabaseFaceitApi';
import { FaceitSyncButtons } from '@/components/FaceitSyncButtons';
import { PandaScoreSyncButtons } from '@/components/PandaScoreSyncButtons';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import { formatMatchDate } from '@/utils/dateMatchUtils';
import { getDetailedMatchCountsByDate, getTotalMatchCountsByDate, MatchCountBreakdown } from '@/utils/matchCountUtils';
import { startOfDay, endOfDay, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

// Define the expected structure of SportDevs teams data
interface SportDevsTeamsData {
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

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilteredLiveMatches, setDateFilteredLiveMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredUpcomingMatches, setDateFilteredUpcomingMatches] = useState<MatchInfo[]>([]);
  const [allMatches, setAllMatches] = useState<MatchInfo[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [detailedMatchCounts, setDetailedMatchCounts] = useState<Record<string, MatchCountBreakdown>>({});
  const [loadingDateFiltered, setLoadingDateFiltered] = useState(true);
  const [loadingAllMatches, setLoadingAllMatches] = useState(true);
  const { toast } = useToast();
  
  // Check if selected date is today
  const isSelectedDateToday = isToday(selectedDate);
  
  // Updated unified match loading function to exclude SportDevs matches
  const loadAllMatchesFromDatabase = async (): Promise<MatchInfo[]> => {
    console.log('🔄 Loading matches from database (FACEIT + PandaScore only)...');
    
    // Fetch FACEIT matches
    const faceitMatches = await fetchSupabaseFaceitAllMatches();
    console.log(`📊 Loaded ${faceitMatches.length} FACEIT matches from database`);
    
    // Fetch PandaScore matches only (excluding SportDevs)
    const { data: pandascoreMatches, error: pandascoreError } = await supabase
      .from('pandascore_matches')
      .select('*')
      .in('status', ['scheduled', 'not_started', 'running', 'live'])
      .order('start_time', { ascending: true })
      .limit(200);

    if (pandascoreError) {
      console.error('Error loading PandaScore matches:', pandascoreError);
    }

    console.log(`📊 Loaded ${pandascoreMatches?.length || 0} PandaScore matches from database`);
    
    // Transform PandaScore matches to MatchInfo format with consistent ID prefixing
    const transformedPandaScore = (pandascoreMatches || []).map(match => {
      const teamsData = match.teams as unknown as PandaScoreTeamsData;
      const matchId = `pandascore_${match.match_id}`;
      
      console.log(`🔄 Homepage - PandaScore match transformed: ${match.match_id} -> ${matchId}`);
      
      return {
        id: matchId, // Ensure consistent prefixing for homepage
        teams: [
          {
            name: teamsData.team1?.name || 'TBD',
            logo: teamsData.team1?.logo || '/placeholder.svg',
            id: `pandascore_team_${match.match_id}_1`
          },
          {
            name: teamsData.team2?.name || 'TBD',
            logo: teamsData.team2?.logo || '/placeholder.svg',
            id: `pandascore_team_${match.match_id}_2`
          }
        ] as [any, any],
        startTime: match.start_time,
        tournament: match.tournament_name || match.league_name || 'Professional Tournament',
        esportType: match.esport_type,
        bestOf: match.number_of_games || 3,
        source: 'professional' as const
      } satisfies MatchInfo;
    });

    const combinedMatches = [...faceitMatches, ...transformedPandaScore];
    console.log(`📊 Total unified dataset: ${combinedMatches.length} matches (${faceitMatches.length} FACEIT + ${transformedPandaScore.length} PandaScore)`);
    
    return combinedMatches;
  };

  // Load all matches for counting (unified dataset)
  useEffect(() => {
    async function loadAllMatches() {
      setLoadingAllMatches(true);
      try {
        const combinedMatches = await loadAllMatchesFromDatabase();
        
        setAllMatches(combinedMatches);
        setMatchCounts(getTotalMatchCountsByDate(combinedMatches));
        setDetailedMatchCounts(getDetailedMatchCountsByDate(combinedMatches));
        
        console.log('📊 Calendar counts updated from unified dataset');
      } catch (error) {
        console.error('Error loading all matches:', error);
        setAllMatches([]);
        setMatchCounts({});
        setDetailedMatchCounts({});
      } finally {
        setLoadingAllMatches(false);
      }
    }
    
    loadAllMatches();
  }, []);

  // Load date-filtered matches using the same unified dataset
  useEffect(() => {
    async function loadDateFilteredMatches() {
      setLoadingDateFiltered(true);
      try {
        console.log('🗓️ Loading matches for selected date using unified dataset:', selectedDate.toDateString());
        
        const selectedDateStart = startOfDay(selectedDate);
        const selectedDateEnd = endOfDay(selectedDate);
        
        // Use the same unified dataset for consistency
        const combinedMatches = await loadAllMatchesFromDatabase();
        
        // Filter matches by selected date
        const dateFilteredMatches = combinedMatches.filter(match => {
          const matchDate = new Date(match.startTime);
          return matchDate >= selectedDateStart && matchDate <= selectedDateEnd;
        });
        
        console.log(`📊 Found ${dateFilteredMatches.length} matches for selected date from unified dataset`);
        
        // Separate by source and add status information for debugging
        const faceitMatches = dateFilteredMatches.filter(m => m.source === 'amateur');
        const professionalMatches = dateFilteredMatches.filter(m => m.source === 'professional');
        
        console.log(`📊 Date-filtered breakdown: ${faceitMatches.length} FACEIT + ${professionalMatches.length} PandaScore = ${dateFilteredMatches.length} total`);
        
        // For now, we'll categorize all matches as upcoming since we're using the database
        // In the future, we could add real-time status checking for live matches
        const liveMatches: MatchInfo[] = [];
        const upcomingMatches = dateFilteredMatches.sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        
        console.log(`📊 Final categorization: ${liveMatches.length} live, ${upcomingMatches.length} upcoming`);
        
        // Log individual matches for debugging
        upcomingMatches.forEach((match, index) => {
          const team1Name = match.teams[0].name;
          const team2Name = match.teams[1].name;
          console.log(`🎮 Match ${index + 1}: ${team1Name} vs ${team2Name} (${match.source}) - ${match.startTime}`);
        });
        
        setDateFilteredLiveMatches(liveMatches);
        setDateFilteredUpcomingMatches(upcomingMatches);
      } catch (error) {
        console.error('Error loading date-filtered matches:', error);
        setDateFilteredLiveMatches([]);
        setDateFilteredUpcomingMatches([]);
      } finally {
        setLoadingDateFiltered(false);
      }
    }
    
    loadDateFilteredMatches();
  }, [selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(startOfDay(date));
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

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow">
        <Hero />
        
        <div className="container mx-auto px-4 py-12">
          {/* Unified Matches Section with Date Picker */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming flex items-center">
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
              <div className="flex gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-gray-400">FACEIT Sync</span>
                  <FaceitSyncButtons />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-gray-400">PandaScore Sync</span>
                  <PandaScoreSyncButtons />
                </div>
              </div>
            </div>

            {loadingAllMatches ? (
              <div className="flex justify-center items-center py-4 mb-4">
                <Loader2 className="h-6 w-6 animate-spin text-theme-purple mr-2" />
                <span className="text-sm text-gray-400">Loading match counts...</span>
              </div>
            ) : (
              <DateMatchPicker
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                matchCounts={matchCounts}
                detailedMatchCounts={detailedMatchCounts}
              />
            )}

            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-300">
                Matches for {formatMatchDate(selectedDate)}
                {!loadingDateFiltered && (
                  <span className="text-sm text-gray-400 ml-2">
                    ({dateFilteredLiveMatches.length + dateFilteredUpcomingMatches.length} total)
                  </span>
                )}
              </h3>
            </div>

            {loadingDateFiltered ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
                <span>Loading matches for selected date...</span>
              </div>
            ) : (
              <>
                {/* Live Matches for Selected Date - Only show if today is selected */}
                {isSelectedDateToday && dateFilteredLiveMatches.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-green-400 mb-4 flex items-center">
                      🔴 Live Now ({dateFilteredLiveMatches.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dateFilteredLiveMatches.map(match => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Matches for Selected Date */}
                {dateFilteredUpcomingMatches.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-blue-400 mb-4 flex items-center">
                      📅 Upcoming ({dateFilteredUpcomingMatches.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dateFilteredUpcomingMatches.map(match => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                )}

                {/* No Matches State */}
                {((!isSelectedDateToday || dateFilteredLiveMatches.length === 0) && dateFilteredUpcomingMatches.length === 0) && (
                  <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                    <p className="text-gray-400 mb-4">No matches scheduled for {formatMatchDate(selectedDate)}.</p>
                    <p className="text-sm text-gray-500">
                      Try selecting a different date or use the sync buttons above to refresh match data.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Tournaments Section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming">
                <span className="highlight-gradient">Active</span> Tournaments
              </h2>
              <Button asChild variant="ghost" className="text-theme-purple hover:text-theme-purple hover:bg-theme-purple/10">
                <Link to="/tournaments">
                  View All <ArrowRight size={16} className="ml-1" />
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Featured Tournament Cards */}
              <div className="bg-theme-gray-dark border border-theme-gray-medium p-4 rounded-md hover:border-theme-purple transition-all flex flex-col">
                <div className="flex items-center mb-3">
                  <Trophy size={20} className="text-theme-purple mr-2" />
                  <h3 className="font-bold">ESL Pro League Season 17</h3>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  Mar 23, 2023 - Apr 10, 2023 • CS:GO
                </div>
                <div className="text-sm mb-3">
                  <span className="text-theme-green">$850,000</span> Prize Pool
                </div>
                <div className="mt-auto text-right">
                  <Button asChild variant="ghost" size="sm" className="text-theme-purple hover:bg-theme-purple/10">
                    <Link to="/tournament/1">
                      View Details <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="bg-theme-gray-dark border border-theme-gray-medium p-4 rounded-md hover:border-theme-purple transition-all flex flex-col">
                <div className="flex items-center mb-3">
                  <Trophy size={20} className="text-theme-purple mr-2" />
                  <h3 className="font-bold">BLAST Premier: Spring Finals 2023</h3>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  Jun 7, 2023 - Jun 11, 2023 • CS:GO
                </div>
                <div className="text-sm mb-3">
                  <span className="text-theme-green">$425,000</span> Prize Pool
                </div>
                <div className="mt-auto text-right">
                  <Button asChild variant="ghost" size="sm" className="text-theme-purple hover:bg-theme-purple/10">
                    <Link to="/tournament/2">
                      View Details <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="bg-theme-gray-dark border border-theme-gray-medium p-4 rounded-md hover:border-theme-purple transition-all flex flex-col">
                <div className="flex items-center mb-3">
                  <Trophy size={20} className="text-theme-purple mr-2" />
                  <h3 className="font-bold">VCT Masters Tokyo</h3>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  Jun 1, 2023 - Jun 25, 2023 • Valorant
                </div>
                <div className="text-sm mb-3">
                  <span className="text-theme-green">$685,000</span> Prize Pool
                </div>
                <div className="mt-auto text-right">
                  <Button asChild variant="ghost" size="sm" className="text-theme-purple hover:bg-theme-purple/10">
                    <Link to="/tournament/3">
                      View Details <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-10">
            <h2 className="text-2xl font-bold font-gaming mb-6 text-center">
              <span className="highlight-gradient">Compare Odds</span> Across Esports
            </h2>
            <p className="text-gray-300 text-center mb-8">
              Find the best betting odds for your favorite esports games and matches. 
              Compare offers from multiple bookmakers all in one place.
            </p>
            <EsportsNavigation />
            <div className="text-center mt-6">
              <Button asChild className="bg-theme-purple hover:bg-theme-purple/90">
                <Link to="/esports/csgo">View All Esports Odds</Link>
              </Button>
            </div>
          </div>
        </div>
        
        <FeaturedGames />
        <TopBettingSites />
        <PromoBanner />
        <Testimonials />
        
        {/* SEO Content Block */}
        <SEOContentBlock 
          title={homepageSEOContent.title}
          paragraphs={homepageSEOContent.paragraphs}
        />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
