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
import { SportDevsSyncButtons } from '@/components/SportDevsSyncButtons';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import { formatMatchDate } from '@/utils/dateMatchUtils';
import { getDetailedMatchCountsByDate, getTotalMatchCountsByDate, MatchCountBreakdown } from '@/utils/matchCountUtils';
import { startOfDay, isToday } from 'date-fns';
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
  
  // Load all matches for counting (both FACEIT and SportDevs)
  useEffect(() => {
    async function loadAllMatches() {
      setLoadingAllMatches(true);
      try {
        console.log('📊 Loading all matches for calendar counts...');
        
        // Fetch FACEIT matches
        const faceitMatches = await fetchSupabaseFaceitAllMatches();
        console.log(`📊 Loaded ${faceitMatches.length} FACEIT matches`);
        
        // Fetch SportDevs matches
        const { data: sportdevsMatches, error } = await supabase
          .from('sportdevs_matches')
          .select('*')
          .in('status', ['live', 'scheduled'])
          .order('start_time', { ascending: true })
          .limit(200);

        if (error) {
          console.error('Error loading SportDevs matches:', error);
        }

        console.log(`📊 Loaded ${sportdevsMatches?.length || 0} SportDevs matches`);

        // Transform SportDevs matches to MatchInfo format
        const transformedSportDevs = (sportdevsMatches || []).map(match => {
          const teamsData = match.teams as unknown as SportDevsTeamsData;
          
          return {
            id: `sportdevs_${match.match_id}`,
            teams: [
              {
                name: teamsData.team1?.name || 'TBD',
                logo: teamsData.team1?.logo || '/placeholder.svg',
                id: `sportdevs_team_${match.match_id}_1`
              },
              {
                name: teamsData.team2?.name || 'TBD',
                logo: teamsData.team2?.logo || '/placeholder.svg',
                id: `sportdevs_team_${match.match_id}_2`
              }
            ] as [any, any],
            startTime: match.start_time,
            tournament: match.tournament_name || 'Professional Match',
            esportType: match.esport_type,
            bestOf: match.best_of || 3,
            source: 'professional' as const
          } satisfies MatchInfo;
        });

        const combinedMatches = [...faceitMatches, ...transformedSportDevs];
        console.log(`📊 Total combined matches: ${combinedMatches.length}`);
        
        setAllMatches(combinedMatches);
        setMatchCounts(getTotalMatchCountsByDate(combinedMatches));
        setDetailedMatchCounts(getDetailedMatchCountsByDate(combinedMatches));
      } catch (error) {
        console.error('Error loading all matches:', error);
        // Fallback to empty state
        setAllMatches([]);
        setMatchCounts({});
        setDetailedMatchCounts({});
      } finally {
        setLoadingAllMatches(false);
      }
    }
    
    loadAllMatches();
  }, []);

  // Helper function to fetch professional matches directly from API as fallback
  const fetchProfessionalMatchesDirect = async (status: 'live' | 'upcoming') => {
    try {
      const apiKey = "GsZ3ovnDw0umMvL5p7SfPA"; // Using the working API key
      const statusParam = status === 'live' ? 'live' : 'upcoming';
      const response = await fetch(`https://esports.sportdevs.com/matches?status_type=eq.${statusParam}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Error fetching ${status} matches from API:`, response.status);
        return [];
      }

      const matches = await response.json();
      
      // Transform matches using the same logic as EsportPage
      return matches.map((match: any) => {
        let teams = [];
        
        if (match.opponents?.length > 0) {
          teams = match.opponents.slice(0, 2).map((opponent: any) => ({
            id: opponent.id || `team-${opponent.name || 'unknown'}`,
            name: opponent.name || 'Unknown Team',
            logo: opponent.hash_image ? `https://images.sportdevs.com/${opponent.hash_image}.png` : '/placeholder.svg'
          }));
        } else if (match.name) {
          const parts = match.name.split(' vs ');
          const team1 = parts[0]?.trim() || 'TBD';
          const team2 = parts[1]?.trim() || 'TBD';
          teams = [
            { id: `team-${team1}`, name: team1, logo: '/placeholder.svg' },
            { id: `team-${team2}`, name: team2, logo: '/placeholder.svg' }
          ];
        }
        
        while (teams.length < 2) {
          teams.push({ id: 'unknown-team', name: 'Unknown Team', logo: '/placeholder.svg' });
        }

        // Determine esport type
        let esportType = 'csgo';
        if (match.videogame?.slug) {
          const gameSlug = match.videogame.slug.toLowerCase();
          if (gameSlug.includes('league') || gameSlug.includes('lol')) esportType = 'lol';
          else if (gameSlug.includes('dota')) esportType = 'dota2';
          else if (gameSlug.includes('valorant')) esportType = 'valorant';
          else if (gameSlug.includes('overwatch')) esportType = 'overwatch';
          else if (gameSlug.includes('rocket')) esportType = 'rocketleague';
        }

        return {
          id: `direct_${match.id}`,
          teams: [teams[0], teams[1]] as [any, any],
          startTime: match.start_time || new Date().toISOString(),
          tournament: match.league_name || match.tournament?.name || 'Professional Match',
          esportType: esportType,
          bestOf: match.format?.best_of || 1,
          source: 'professional' as const
        } satisfies MatchInfo;
      });
    } catch (error) {
      console.error(`Error fetching ${status} matches directly:`, error);
      return [];
    }
  };

  // Load date-filtered matches (combining FACEIT and SportDevs with fallback)
  useEffect(() => {
    async function loadDateFilteredMatches() {
      setLoadingDateFiltered(true);
      try {
        console.log('🗓️ Loading matches for selected date:', selectedDate.toDateString());
        
        const selectedDateStart = startOfDay(selectedDate);
        const selectedDateEnd = new Date(selectedDateStart);
        selectedDateEnd.setHours(23, 59, 59, 999);
        
        // Fetch FACEIT matches for the selected date
        const { live: faceitLive, upcoming: faceitUpcoming } = await fetchSupabaseFaceitMatchesByDate(selectedDate);
        
        // Fetch SportDevs matches for the selected date
        const { data: sportdevsLive, error: liveError } = await supabase
          .from('sportdevs_matches')
          .select('*')
          .eq('status', 'live')
          .gte('start_time', selectedDateStart.toISOString())
          .lte('start_time', selectedDateEnd.toISOString())
          .order('start_time', { ascending: false })
          .limit(50);

        const { data: sportdevsUpcoming, error: upcomingError } = await supabase
          .from('sportdevs_matches')
          .select('*')
          .eq('status', 'scheduled')
          .gte('start_time', selectedDateStart.toISOString())
          .lte('start_time', selectedDateEnd.toISOString())
          .order('start_time', { ascending: true })
          .limit(50);

        if (liveError) console.error('Error fetching live SportDevs matches:', liveError);
        if (upcomingError) console.error('Error fetching upcoming SportDevs matches:', upcomingError);

        // Transform SportDevs matches
        const transformedLiveSportDevs = (sportdevsLive || []).map(match => {
          const teamsData = match.teams as unknown as SportDevsTeamsData;
          
          return {
            id: `sportdevs_${match.match_id}`,
            teams: [
              {
                name: teamsData.team1?.name || 'TBD',
                logo: teamsData.team1?.logo || '/placeholder.svg',
                id: `sportdevs_team_${match.match_id}_1`
              },
              {
                name: teamsData.team2?.name || 'TBD',
                logo: teamsData.team2?.logo || '/placeholder.svg',
                id: `sportdevs_team_${match.match_id}_2`
              }
            ] as [any, any],
            startTime: match.start_time,
            tournament: match.tournament_name || 'Professional Match',
            esportType: match.esport_type,
            bestOf: match.best_of || 3,
            source: 'professional' as const
          } satisfies MatchInfo;
        });

        const transformedUpcomingSportDevs = (sportdevsUpcoming || []).map(match => {
          const teamsData = match.teams as unknown as SportDevsTeamsData;
          
          return {
            id: `sportdevs_${match.match_id}`,
            teams: [
              {
                name: teamsData.team1?.name || 'TBD',
                logo: teamsData.team2?.logo || '/placeholder.svg',
                id: `sportdevs_team_${match.match_id}_1`
              },
              {
                name: teamsData.team2?.name || 'TBD',
                logo: teamsData.team2?.logo || '/placeholder.svg',
                id: `sportdevs_team_${match.match_id}_2`
              }
            ] as [any, any],
            startTime: match.start_time,
            tournament: match.tournament_name || 'Professional Match',
            esportType: match.esport_type,
            bestOf: match.best_of || 3,
            source: 'professional' as const
          } satisfies MatchInfo;
        });
        
        // Fallback: if no professional matches from database, fetch directly from API
        let fallbackLive: MatchInfo[] = [];
        let fallbackUpcoming: MatchInfo[] = [];
        
        if (transformedLiveSportDevs.length === 0) {
          console.log('📡 No live professional matches in database, fetching directly from API...');
          fallbackLive = await fetchProfessionalMatchesDirect('live');
        }
        
        if (transformedUpcomingSportDevs.length === 0) {
          console.log('📡 No upcoming professional matches in database, fetching directly from API...');
          fallbackUpcoming = await fetchProfessionalMatchesDirect('upcoming');
        }
        
        // Combine and sort matches
        const allLiveMatches = [...faceitLive, ...transformedLiveSportDevs, ...fallbackLive].sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        
        const allUpcomingMatches = [...faceitUpcoming, ...transformedUpcomingSportDevs, ...fallbackUpcoming].sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        
        setDateFilteredLiveMatches(allLiveMatches);
        setDateFilteredUpcomingMatches(allUpcomingMatches);
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
                  <span className="text-xs text-gray-400">Pro Sync</span>
                  <SportDevsSyncButtons />
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
