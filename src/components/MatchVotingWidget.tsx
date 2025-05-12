
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp } from 'lucide-react';
import { TeamInfo } from '@/components/MatchCard';
import { useToast } from '@/hooks/use-toast';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';

interface MatchVotingWidgetProps {
  matchId: string;
  teams: [TeamInfo, TeamInfo];
}

const MatchVotingWidget: React.FC<MatchVotingWidgetProps> = ({ matchId, teams }) => {
  const { toast } = useToast();
  // Always initialize state values
  const [votes, setVotes] = useState<{ [teamId: string]: number }>({});
  const [votedTeamId, setVotedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load votes from localStorage on component mount
  useEffect(() => {
    const loadVotes = () => {
      try {
        // These values are used for initialization only
        let team1Id = teams[0]?.id || 'team1';
        let team2Id = teams[1]?.id || 'team2';
        
        // Check if user already voted
        const userVotedTeam = localStorage.getItem(`match_${matchId}_user_vote`);
        if (userVotedTeam) {
          setVotedTeamId(userVotedTeam);
        }
        
        // Load team votes
        const team1Votes = parseInt(localStorage.getItem(`match_${matchId}_votes_${team1Id}`) || '0');
        const team2Votes = parseInt(localStorage.getItem(`match_${matchId}_votes_${team2Id}`) || '0');
        
        // Initialize with some votes if none exist
        const initialVotes = {
          [team1Id]: team1Votes || Math.floor(Math.random() * 20) + 30,
          [team2Id]: team2Votes || Math.floor(Math.random() * 20) + 25
        };
        
        setVotes(initialVotes);
      } catch (error) {
        console.error('Error loading votes:', error);
      }
    };
    
    loadVotes();
  }, [matchId, teams]);
  
  const handleVote = (teamId: string) => {
    if (votedTeamId) {
      toast({
        title: "Already voted",
        description: "You've already cast your vote for this match.",
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate a small delay for better UX
    setTimeout(() => {
      const newVotes = { ...votes };
      const teamKey = teamId || (teamId === teams[0].id ? 'team1' : 'team2');
      newVotes[teamKey] = (newVotes[teamKey] || 0) + 1;
      
      // Save to localStorage
      localStorage.setItem(`match_${matchId}_votes_${teamKey}`, String(newVotes[teamKey]));
      localStorage.setItem(`match_${matchId}_user_vote`, teamKey);
      
      setVotes(newVotes);
      setVotedTeamId(teamKey);
      setIsLoading(false);
      
      toast({
        title: "Vote recorded!",
        description: `You voted for ${teams.find(t => t.id === teamId)?.name || 'this team'}.`
      });
    }, 500);
  };
  
  // Calculate vote percentages
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
  const getVotePercentage = (teamId: string) => {
    const teamVotes = votes[teamId || 'unknown'] || 0;
    return totalVotes > 0 ? Math.round((teamVotes / totalVotes) * 100) : 0;
  };
  
  // Multiply votes for display (as requested)
  const getDisplayVotes = (teamId: string) => {
    return ((votes[teamId || 'unknown'] || 0) * 10);
  };
  
  // Make sure we have valid teams data
  const safeTeams: [TeamInfo, TeamInfo] = [
    teams[0] || { name: 'Team 1', logo: '/placeholder.svg', id: 'team1' },
    teams[1] || { name: 'Team 2', logo: '/placeholder.svg', id: 'team2' }
  ];
  
  return (
    <div className="bg-theme-gray-dark border border-theme-gray-medium rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Who will win?</h3>
        <p className="text-xs text-gray-400">Total votes: {totalVotes * 10}</p>
      </div>
      
      <div className="flex justify-between items-center gap-2 mt-2">
        {safeTeams.map((team, index) => {
          const teamId = team.id || `team${index + 1}`;
          const hasVoted = votedTeamId === teamId;
          const votePercentage = getVotePercentage(teamId);
          // Get enhanced team logo URL using our new utility
          const teamLogoUrl = getEnhancedTeamLogoUrl(team);
          
          return (
            <div key={teamId} className="flex-1">
              <Button
                onClick={() => handleVote(teamId)}
                disabled={!!votedTeamId || isLoading}
                className={`
                  w-full px-2 py-1 h-auto transition-colors flex items-center justify-between
                  ${hasVoted 
                    ? 'bg-theme-purple text-white' 
                    : votedTeamId 
                      ? 'bg-theme-gray-medium text-gray-400' 
                      : 'bg-theme-gray-light hover:bg-theme-purple hover:text-white'}
                  ${hasVoted ? 'relative' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <img 
                    src={teamLogoUrl} 
                    alt={team.name} 
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      console.log(`Logo load error for ${team.name}, falling back to placeholder`);
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  <span className="text-xs font-medium truncate max-w-[80px]">{team.name}</span>
                </div>
                
                <div className="text-xs">
                  {votePercentage}%
                  {hasVoted && <ThumbsUp size={12} className="ml-1 inline-block" />}
                </div>
                
                {hasVoted && (
                  <div className="absolute -top-2 -right-2 bg-theme-purple text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    Your pick
                  </div>
                )}
              </Button>
              
              <div className="w-full bg-theme-gray-medium rounded-full h-1 mt-1">
                <div 
                  className="bg-theme-purple h-1 rounded-full transition-all duration-500" 
                  style={{ width: `${votePercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MatchVotingWidget;
