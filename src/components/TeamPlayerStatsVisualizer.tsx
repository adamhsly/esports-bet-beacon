
import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchRecentTeamMatches, 
  fetchMatchFullDetails,
  generateMockMatchData
} from '@/lib/teamStatsApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, Calendar, Users, TrendingUp, TrendingDown } from 'lucide-react';
import MatchTimelineSelector from '@/components/stats/MatchTimelineSelector';
import PlayerPerformanceChart from '@/components/stats/PlayerPerformanceChart';
import TeamStatsRadarChart from '@/components/stats/TeamStatsRadarChart';
import TeamPerformanceTrend from '@/components/stats/TeamPerformanceTrend';
import { useToast } from '@/hooks/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface TeamPlayerStatsVisualizerProps {
  teamId: string;
  teamName?: string;
  esportType: string;
  opponentTeamId?: string;
  opponentTeamName?: string;
}

const TeamPlayerStatsVisualizer: React.FC<TeamPlayerStatsVisualizerProps> = ({
  teamId,
  teamName = 'Team',
  esportType,
  opponentTeamId,
  opponentTeamName
}) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<any>(null);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isLoadingMatchDetails, setIsLoadingMatchDetails] = useState(false);
  const { toast } = useToast();
  
  // Convert esportType to the appropriate format for the charts
  const gameType = useMemo(() => {
    if (esportType.includes('csgo') || esportType.includes('cs:')) return 'csgo';
    if (esportType.includes('dota')) return 'dota2';
    if (esportType.includes('lol') || esportType.includes('league')) return 'lol';
    return 'csgo'; // default
  }, [esportType]);
  
  console.log(`TeamPlayerStatsVisualizer - initializing for team: ${teamId}(${teamName}), esportType: ${esportType}, gameType: ${gameType}`);
  
  // Load match history when component mounts
  useEffect(() => {
    const loadMatchHistory = async () => {
      setIsLoadingMatches(true);
      try {
        console.log(`Loading match history for team ${teamId} (${teamName})`);
        
        // Try to fetch recent matches from API
        const recentMatches = await fetchRecentTeamMatches(teamId);
        
        // If we got matches from the API, use them
        if (recentMatches && recentMatches.length > 0) {
          console.log(`Found ${recentMatches.length} matches for team ${teamId}`);
          setMatches(recentMatches);
          setSelectedMatchId(recentMatches[0].id);
        } else {
          // Otherwise, generate mock data
          console.log(`No matches found for team ${teamId} - generating mock data`);
          const mockMatches = generateMockMatchData(teamId, opponentTeamId || 'unknown', 8);
          console.log("Generated mock matches:", mockMatches.length);
          
          if (mockMatches && mockMatches.length > 0) {
            setMatches(mockMatches);
            setSelectedMatchId(mockMatches[0].id);
          } else {
            console.error("Failed to generate mock matches");
            toast({
              title: "Error loading data",
              description: "Could not load match history or generate sample data.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error loading match history:', error);
        toast({
          title: "Using sample data",
          description: "Could not load match history from API. Showing sample data instead.",
          variant: "default",
        });
        
        // Generate detailed mock data as fallback
        console.log(`Generating fallback mock data for team ${teamId} vs ${opponentTeamId || 'unknown'}`);
        const mockMatches = generateMockMatchData(teamId, opponentTeamId || 'unknown', 8);
        console.log("Generated fallback mock matches:", mockMatches.length);
        
        if (mockMatches && mockMatches.length > 0) {
          setMatches(mockMatches);
          setSelectedMatchId(mockMatches[0].id);
        } else {
          console.error("Failed to generate fallback mock matches");
        }
      } finally {
        setIsLoadingMatches(false);
      }
    };
    
    loadMatchHistory();
  }, [teamId, opponentTeamId, teamName, toast]);
  
  // Load match details when selected match changes
  useEffect(() => {
    const loadMatchDetails = async () => {
      if (!selectedMatchId) return;
      
      setIsLoadingMatchDetails(true);
      try {
        console.log(`Loading details for match ${selectedMatchId}`);
        
        // Try to fetch match details from API
        const details = await fetchMatchFullDetails(selectedMatchId);
        
        // If we got details from the API, use them
        if (details) {
          console.log(`Loaded details for match ${selectedMatchId}`);
          setMatchDetails(details);
        } else {
          // Otherwise, use mock data embedded in the match
          console.log(`Using embedded mock details for match ${selectedMatchId}`);
          const selectedMatch = matches.find(m => m.id === selectedMatchId);
          if (selectedMatch) {
            setMatchDetails({
              lineups: selectedMatch.lineups || [],
              playerStats: selectedMatch.playerStats || [],
              teamStats: selectedMatch.teamStats ? [selectedMatch.teamStats] : []
            });
          }
        }
      } catch (error) {
        console.error('Error loading match details:', error);
        toast({
          title: "Using available data",
          description: "Could not load match details. Using available data instead.",
          variant: "default",
        });
        
        // Use any available data from the match object as fallback
        const selectedMatch = matches.find(m => m.id === selectedMatchId);
        if (selectedMatch) {
          console.log(`Falling back to embedded data for match ${selectedMatchId}`);
          setMatchDetails({
            lineups: selectedMatch.lineups || [],
            playerStats: selectedMatch.playerStats || [],
            teamStats: selectedMatch.teamStats ? [selectedMatch.teamStats] : []
          });
        }
      } finally {
        setIsLoadingMatchDetails(false);
      }
    };
    
    loadMatchDetails();
  }, [selectedMatchId, matches, toast]);
  
  // Enhance matches with details for trend analysis
  const enhancedMatches = useMemo(() => {
    return matches.map(match => {
      // For the selected match, use the loaded details
      if (match.id === selectedMatchId && matchDetails) {
        return {
          ...match,
          playerStats: matchDetails.playerStats,
          teamStats: matchDetails.teamStats && matchDetails.teamStats.length > 0 
            ? matchDetails.teamStats[0] 
            : match.teamStats
        };
      }
      
      // For other matches, use their existing details if available
      return match;
    });
  }, [matches, selectedMatchId, matchDetails]);
  
  // Extract player stats for the selected match
  const playerStats = useMemo(() => {
    if (!matchDetails) return [];
    
    return matchDetails.playerStats || [];
  }, [matchDetails]);
  
  // Extract team stats for the selected match
  const teamStats = useMemo(() => {
    if (!matchDetails) return {};
    
    const stats = matchDetails.teamStats && matchDetails.teamStats.length > 0 
      ? matchDetails.teamStats[0] 
      : {};
      
    return stats;
  }, [matchDetails]);
  
  // Calculate aggregate team statistics
  const aggregateStats = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    
    console.log(`Calculating aggregate stats from ${matches.length} matches`);
    
    // Initialize counters
    let totalMatches = matches.length;
    let wins = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let matchesWithStats = 0;
    
    // Calculate stats from all matches
    matches.forEach(match => {
      // Count wins
      if (match.result === 'win') {
        wins++;
      }
      
      // Aggregate team stats if available
      if (match.teamStats) {
        matchesWithStats++;
        totalKills += match.teamStats.kills || 0;
        totalDeaths += match.teamStats.deaths || 0;
        totalAssists += match.teamStats.assists || 0;
      }
    });
    
    // Calculate win rate
    const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : '0';
    
    // Calculate K/D ratio
    const kdRatio = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : '0';
    
    // Calculate K/D/A ratio
    const kdaRatio = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : '0';
    
    // Calculate average stats per match
    const avgKills = matchesWithStats > 0 ? (totalKills / matchesWithStats).toFixed(1) : '0';
    const avgDeaths = matchesWithStats > 0 ? (totalDeaths / matchesWithStats).toFixed(1) : '0';
    
    // Get recent form (last 5 matches)
    const recentForm = matches
      .slice(0, 5)
      .map(match => match.result || 'unknown')
      .map(result => result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D');
    
    console.log(`Aggregate stats calculated: Win rate ${winRate}%, K/D ${kdRatio}`);
    
    return {
      winRate,
      kdRatio,
      kdaRatio,
      avgKills,
      avgDeaths,
      recentForm,
      matchesAnalyzed: totalMatches
    };
  }, [matches]);

  if (isLoadingMatches && matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-theme-purple mb-4" />
        <p>Loading team statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-theme-purple" />
          Team Statistics
        </h3>
      </div>
      
      {/* Aggregate Stats Section (Always Shown at Top) */}
      <div className="mb-6">
        <Card className="p-4 bg-theme-gray-dark border border-theme-gray-medium">
          <h4 className="text-md font-medium mb-3 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-theme-purple" />
            Aggregate Performance
          </h4>
          
          {isLoadingMatches ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-theme-purple" />
            </div>
          ) : aggregateStats ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-theme-gray-medium/30 p-3 rounded-md">
                  <p className="text-sm text-gray-400">Win Rate</p>
                  <p className="text-xl font-bold">{aggregateStats.winRate}%</p>
                </div>
                <div className="bg-theme-gray-medium/30 p-3 rounded-md">
                  <p className="text-sm text-gray-400">K/D Ratio</p>
                  <p className="text-xl font-bold">{aggregateStats.kdRatio}</p>
                </div>
                <div className="bg-theme-gray-medium/30 p-3 rounded-md">
                  <p className="text-sm text-gray-400">Avg. Kills</p>
                  <p className="text-xl font-bold">{aggregateStats.avgKills}</p>
                </div>
                <div className="bg-theme-gray-medium/30 p-3 rounded-md">
                  <p className="text-sm text-gray-400">Matches</p>
                  <p className="text-xl font-bold">{aggregateStats.matchesAnalyzed}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <p className="text-sm mr-2">Form (Last 5):</p>
                <div className="flex space-x-1">
                  {aggregateStats.recentForm.map((result, idx) => (
                    <div 
                      key={idx} 
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                        ${result === 'W' ? 'bg-green-500/70' : 
                          result === 'L' ? 'bg-red-500/70' : 'bg-gray-500/70'}`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No aggregate statistics available</p>
          )}
        </Card>
      </div>
      
      {/* Match History and Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h4 className="text-md font-medium mb-3 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-theme-purple" />
            Match History
          </h4>
          <MatchTimelineSelector
            matches={matches}
            selectedMatchId={selectedMatchId}
            onSelectMatch={setSelectedMatchId}
            isLoading={isLoadingMatches}
          />
        </div>
        <div className="md:col-span-2">
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="players">Player Performance</TabsTrigger>
              <TabsTrigger value="team">Team Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="players">
              <Card className="p-4 bg-theme-gray-dark border border-theme-gray-medium">
                <h4 className="text-md font-medium mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-theme-purple" />
                  Player Stats - {selectedMatchId ? `Match #${selectedMatchId}` : 'Selected Match'}
                </h4>
                <div className="w-full">
                  <AspectRatio ratio={16 / 9} className="bg-theme-gray-medium/20 rounded-md overflow-hidden">
                    <PlayerPerformanceChart
                      playerStats={playerStats}
                      gameType={gameType as any}
                      isLoading={isLoadingMatchDetails}
                    />
                  </AspectRatio>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="team">
              <Card className="p-4 bg-theme-gray-dark border border-theme-gray-medium">
                <h4 className="text-md font-medium mb-3 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-theme-purple" />
                  Team Stats - {selectedMatchId ? `Match #${selectedMatchId}` : 'Selected Match'}
                </h4>
                <div className="w-full">
                  <AspectRatio ratio={16 / 9} className="bg-theme-gray-medium/20 rounded-md overflow-hidden">
                    <TeamStatsRadarChart
                      teamStats={teamStats}
                      gameType={gameType as any}
                      isLoading={isLoadingMatchDetails}
                    />
                  </AspectRatio>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Team Performance Trend */}
          <div className="mt-6">
            <Card className="p-4 bg-theme-gray-dark border border-theme-gray-medium">
              <h4 className="text-md font-medium mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-theme-purple" />
                Performance Trend
              </h4>
              <div className="w-full">
                <AspectRatio ratio={16 / 9} className="bg-theme-gray-medium/20 rounded-md overflow-hidden">
                  <TeamPerformanceTrend
                    matches={enhancedMatches}
                    gameType={gameType as any}
                    isLoading={isLoadingMatches}
                  />
                </AspectRatio>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPlayerStatsVisualizer;
