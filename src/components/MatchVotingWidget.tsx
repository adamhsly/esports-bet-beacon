
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp } from 'lucide-react';
import { TeamInfo } from '@/components/MatchCard';
import { useToast } from '@/hooks/use-toast';

interface MatchVotingWidgetProps {
  matchId: string;
  teams: [TeamInfo, TeamInfo];
}

const MatchVotingWidget: React.FC<MatchVotingWidgetProps> = ({ matchId, teams }) => {
  const { toast } = useToast();
  const [votes, setVotes] = useState<{ [teamId: string]: number }>({});
  const [votedTeamId, setVotedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load votes from localStorage on component mount
  useEffect(() => {
    const loadVotes = () => {
      try {
        // Check if user already voted
        const userVotedTeam = localStorage.getItem(`match_${matchId}_user_vote`);
        if (userVotedTeam) {
          setVotedTeamId(userVotedTeam);
        }
        
        // Load team votes
        const team1Votes = parseInt(localStorage.getItem(`match_${matchId}_votes_${teams[0].id}`) || '0');
        const team2Votes = parseInt(localStorage.getItem(`match_${matchId}_votes_${teams[1].id}`) || '0');
        
        // Initialize with some votes if none exist
        const initialVotes = {
          [teams[0].id || 'team1']: team1Votes || Math.floor(Math.random() * 20) + 30,
          [teams[1].id || 'team2']: team2Votes || Math.floor(Math.random() * 20) + 25
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
  
  return (
    <div className="bg-theme-gray-dark border border-theme-gray-medium rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium text-center mb-4">Who will win this match?</h3>
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        {teams.map((team, index) => {
          const teamId = team.id || `team${index + 1}`;
          const hasVoted = votedTeamId === teamId;
          const votePercentage = getVotePercentage(teamId);
          
          return (
            <div 
              key={teamId}
              className={`flex-1 w-full ${index === 0 ? 'md:mr-2' : 'md:ml-2'}`}
            >
              <div 
                className={`
                  relative flex flex-col items-center p-4 rounded-lg border-2 transition-all
                  ${hasVoted 
                    ? 'bg-theme-purple bg-opacity-20 border-theme-purple' 
                    : 'bg-theme-gray-medium bg-opacity-30 border-theme-gray-medium hover:border-theme-purple'}
                `}
              >
                <img 
                  src={team.logo || '/placeholder.svg'} 
                  alt={team.name} 
                  className="w-16 h-16 object-contain mb-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <h4 className="font-medium text-lg mb-2">{team.name}</h4>
                
                <div className="flex flex-col items-center w-full">
                  <div className="w-full bg-theme-gray-medium rounded-full h-2.5 mb-2">
                    <div 
                      className="bg-theme-purple h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${votePercentage}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between w-full text-sm">
                    <span>{votePercentage}%</span>
                    <span>{getDisplayVotes(teamId)} votes</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleVote(teamId)}
                  disabled={!!votedTeamId || isLoading}
                  className={`
                    mt-4 w-full transition-colors
                    ${hasVoted 
                      ? 'bg-theme-purple text-white' 
                      : votedTeamId 
                        ? 'bg-theme-gray-medium text-gray-400' 
                        : 'bg-theme-gray-light hover:bg-theme-purple hover:text-white'}
                  `}
                >
                  <ThumbsUp size={16} className="mr-2" />
                  {hasVoted 
                    ? 'Voted!' 
                    : votedTeamId 
                      ? 'Already Voted' 
                      : 'Vote'}
                </Button>
                
                {hasVoted && (
                  <div className="absolute -top-2 -right-2 bg-theme-purple text-white text-xs px-2 py-1 rounded-full">
                    Your pick
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-center text-gray-400 mt-4">
        {votedTeamId 
          ? 'Thanks for voting!' 
          : 'Click on a team to cast your vote'} 
        • Total votes: {totalVotes * 10}
      </p>
    </div>
  );
};

export default MatchVotingWidget;
