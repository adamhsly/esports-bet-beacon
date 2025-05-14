import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchRecentTeamMatches, 
  fetchMatchFullDetails,
  generateMockMatchData
} from '@/lib/teamStatsApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, Calendar } from 'lucide-react';
import MatchTimelineSelector from '@/components/stats/MatchTimelineSelector';
import PlayerPerformanceChart from '@/components/stats/PlayerPerformanceChart';
import TeamStatsRadarChart from '@/components/stats/TeamStatsRadarChart';
import TeamPerformanceTrend from '@/components/stats/TeamPerformanceTrend';
import { useToast } from '@/hooks/use-toast';

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
  const [viewMode, setViewMode] = useState<'single' | 'aggregate'>('single');
  const { toast } = useToast();
  
  // Convert esportType to the appropriate format for the charts
  const gameType = useMemo(() => {
    if (esportType.includes('csgo') || esportType.includes('cs:')) return 'csgo';
    if (esportType.includes('dota')) return 'dota2';
    if (esportType.includes('lol') || esportType.includes('league')) return 'lol';
    return 'csgo'; // default
  }, [esportType]);
  
  // Load match history when component mounts
  useEffect(() => {
    const loadMatchHistory = async () => {
      setIsLoadingMatches(true);
      try {
        // Try to fetch recent matches from API
        const recentMatches = await fetchRecentTeamMatches(teamId);
        
        // If we got matches from the API, use them
        if (recentMatches && recentMatches.length > 0) {
          console.log(`Found ${recentMatches.length} matches for team ${teamId}`);
          setMatches(recentMatches);
          setSelectedMatchId(recentMatches[0].id);
        } else {
          // Otherwise, generate mock data
          console.log(`Generating mock match data for team ${teamId}`);
          const mockMatches = generateMockMatchData(teamId, opponentTeamId || 'unknown');
          setMatches(mockMatches);
          setSelectedMatchId(mockMatches[0].id);
        }
      } catch (error) {
        console.error('Error loading match history:', error);
        toast({
          title: "Error loading match history",
          description: "Could not load match history. Using sample data instead.",
          variant: "destructive",
        });
        
        // Generate mock data as fallback
        const mockMatches = generateMockMatchData(teamId, opponentTeamId || 'unknown');
        setMatches(mockMatches);
        setSelectedMatchId(mockMatches[0].id);
      } finally {
        setIsLoadingMatches(false);
      }
    };
    
    loadMatchHistory();
  }, [teamId, opponentTeamId, toast]);
  
  // Load match details when selected match changes
  useEffect(() => {
    const loadMatchDetails = async () => {
      if (!selectedMatchId) return;
      
      setIsLoadingMatchDetails(true);
      try {
        // Try to fetch match details from API
        const details = await fetchMatchFullDetails(selectedMatchId);
        
        // If we got details from the API, use them
        if (details) {
          console.log(`Loaded details for match ${selectedMatchId}`);
          setMatchDetails(details);
        } else {
          // Otherwise, use mock data embedded in the match
          const selectedMatch = matches.find(m => m.id === selectedMatchId);
          if (selectedMatch) {
            console.log(`Using embedded mock details for match ${selectedMatchId}`);
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
          title: "Error loading match details",
          description: "Could not load match details. Using available data instead.",
          variant: "destructive",
        });
        
        // Use any available data from the match object as fallback
        const selectedMatch = matches.find(m => m.id === selectedMatchId);
        if (selectedMatch) {
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
        
        <Select
          value={viewMode}
          onValueChange={(value) => setViewMode(value as 'single' | 'aggregate')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="View Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single Match</SelectItem>
            <SelectItem value="aggregate">Aggregate Trends</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {viewMode === 'single' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
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
                <PlayerPerformanceChart
                  playerStats={playerStats}
                  gameType={gameType as any}
                  isLoading={isLoadingMatchDetails}
                />
              </TabsContent>
              
              <TabsContent value="team">
                <TeamStatsRadarChart
                  teamStats={teamStats}
                  gameType={gameType as any}
                  isLoading={isLoadingMatchDetails}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <TeamPerformanceTrend
            matches={enhancedMatches}
            gameType={gameType as any}
            isLoading={isLoadingMatches}
          />
        </div>
      )}
    </div>
  );
};

export default TeamPlayerStatsVisualizer;
