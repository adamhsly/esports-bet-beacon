import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Star, 
  RefreshCw, 
  ChevronDown, 
  CalendarClock, 
  Trophy,
  Activity,
  Users,
  TrendingUp
} from 'lucide-react';
import { TeamCard } from './TeamCard';
import { cn } from '@/lib/utils';

interface Team {
  id: string;
  name: string;
  type: 'pro' | 'amateur';
  logo_url?: string;
  score?: number;
  next_match?: {
    opponent: string;
    date: string;
    tournament: string;
  };
}

interface RoundSummary {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'finished' | 'upcoming';
  title: string;
  endDate: string;
  teams: Team[];
  currentScore: number;
  rank: number;
  totalParticipants: number;
  scoringBreakdown: {
    matchWins: number;
    mapWins: number;
    tournamentWins: number;
    starBonus: number;
  };
  activityFeed: {
    id: string;
    type: 'score_update' | 'match_result' | 'star_bonus';
    message: string;
    timestamp: string;
    points?: number;
  }[];
}

interface RoundSummaryCardsProps {
  rounds: RoundSummary[];
  onRoundSelect?: (roundId: string) => void;
  selectedRoundId?: string;
}

const getRoundImage = (type: string) => {
  switch (type) {
    case 'daily': return '/lovable-uploads/daily_round.png';
    case 'weekly': return '/lovable-uploads/weekly_round.png';
    case 'monthly': return '/lovable-uploads/monthly_round.png';
    default: return '/lovable-uploads/daily_round.png';
  }
};

const getRoundColors = (type: string) => {
  switch (type) {
    case 'daily':
      return {
        primary: 'rgb(79, 172, 254)', // neon-blue
        border: 'border-[#4FACFE]',
        bg: 'bg-[#4FACFE]/10',
        glow: 'shadow-[0_0_20px_rgba(79,172,254,0.3)]'
      };
    case 'weekly':
      return {
        primary: 'rgb(245, 192, 66)', // gold
        border: 'border-[#F5C042]',
        bg: 'bg-[#F5C042]/10',
        glow: 'shadow-[0_0_20px_rgba(245,192,66,0.3)]'
      };
    case 'monthly':
      return {
        primary: 'rgb(138, 117, 255)', // neon-purple
        border: 'border-[#8A75FF]',
        bg: 'bg-[#8A75FF]/10',
        glow: 'shadow-[0_0_20px_rgba(138,117,255,0.3)]'
      };
    default:
      return {
        primary: 'rgb(79, 172, 254)',
        border: 'border-[#4FACFE]',
        bg: 'bg-[#4FACFE]/10',
        glow: 'shadow-[0_0_20px_rgba(79,172,254,0.3)]'
      };
  }
};

const RoundSummaryCard: React.FC<{ 
  round: RoundSummary; 
  isSelected: boolean; 
  onClick: () => void; 
}> = ({ round, isSelected, onClick }) => {
  const colors = getRoundColors(round.type);
  
  return (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all duration-300 hover:scale-[1.02] flex-shrink-0 w-72 snap-start",
        "bg-gradient-to-br from-[#1A1F26] to-[#252A32] border-2",
        isSelected 
          ? `${colors.border} ${colors.bg} ${colors.glow}` 
          : "border-white/[0.08] hover:border-white/20"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          {/* Round Logo */}
          <div className="relative p-2 bg-white/5 rounded-lg border border-white/10">
            <img 
              src={getRoundImage(round.type)} 
              alt={`${round.type} round`} 
              className="w-8 h-8 object-contain"
            />
          </div>
          
          {/* Round Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-gaming text-white text-sm truncate">{round.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                className={cn(
                  "text-xs font-gaming px-2 py-0.5",
                  round.type === 'daily' && "bg-[#4FACFE]/20 text-[#4FACFE] border-[#4FACFE]/30",
                  round.type === 'weekly' && "bg-[#F5C042]/20 text-[#F5C042] border-[#F5C042]/30",
                  round.type === 'monthly' && "bg-[#8A75FF]/20 text-[#8A75FF] border-[#8A75FF]/30"
                )}
              >
                {round.type.toUpperCase()}
              </Badge>
              <Badge 
                variant={round.status === 'active' ? 'default' : 'secondary'} 
                className="text-xs"
              >
                {round.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Score & Rank */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-2xl font-bold text-white">{round.currentScore}</div>
            <div className="text-xs text-muted-foreground">Current Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">#{round.rank}</div>
            <div className="text-xs text-muted-foreground">of {round.totalParticipants}</div>
          </div>
        </div>

        {/* Teams Preview */}
        <div className="flex items-center gap-1 overflow-hidden">
          {round.teams.slice(0, 4).map((team, index) => (
            <div 
              key={team.id}
              className="w-6 h-6 rounded border border-white/20 bg-white/5 flex items-center justify-center flex-shrink-0"
            >
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-4 h-4 object-contain" />
              ) : (
                <Users className="w-3 h-3 text-white/60" />
              )}
            </div>
          ))}
          {round.teams.length > 4 && (
            <div className="text-xs text-muted-foreground ml-1">
              +{round.teams.length - 4}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const RoundSummaryCards: React.FC<RoundSummaryCardsProps> = ({ 
  rounds, 
  onRoundSelect, 
  selectedRoundId 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedRound, setSelectedRound] = useState<RoundSummary | null>(
    rounds.find(r => r.id === selectedRoundId) || rounds[0] || null
  );
  const [isScoringOpen, setIsScoringOpen] = useState(false);

  const handleRoundSelect = (round: RoundSummary) => {
    setSelectedRound(round);
    onRoundSelect?.(round.id);
  };

  if (!selectedRound) return null;

  const colors = getRoundColors(selectedRound.type);

  return (
    <div className="space-y-6">
      {/* Horizontally Swipeable Cards */}
      <div className="relative">
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {rounds.map((round) => (
            <RoundSummaryCard
              key={round.id}
              round={round}
              isSelected={round.id === selectedRound.id}
              onClick={() => handleRoundSelect(round)}
            />
          ))}
        </div>
      </div>

      {/* Selected Round Details */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-gaming text-white">{selectedRound.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <CalendarClock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ends {selectedRound.endDate}</span>
            </div>
          </div>
          
          {/* Action Buttons (Disabled Placeholders) */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled
              className="opacity-50"
            >
              <Star className="w-4 h-4 mr-2" />
              Star Team
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled
              className="opacity-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Transfer
            </Button>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-gaming text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Your Teams
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedRound.teams.map((team) => (
              <div key={team.id} className="relative">
                <TeamCard
                  team={team}
                  isSelected={false}
                  onClick={() => {}}
                  variant="progress"
                />
                {team.next_match && (
                  <div className="mt-2 p-2 bg-white/5 rounded border border-white/10">
                    <div className="text-xs text-muted-foreground">Next Match</div>
                    <div className="text-sm text-white font-medium">
                      vs {team.next_match.opponent}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {team.next_match.date} • {team.next_match.tournament}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Scoring Breakdown */}
        <Collapsible open={isScoringOpen} onOpenChange={setIsScoringOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Scoring Breakdown
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                isScoringOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Match Wins</div>
                    <div className="text-lg font-bold text-white">
                      {selectedRound.scoringBreakdown.matchWins}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Map Wins</div>
                    <div className="text-lg font-bold text-white">
                      {selectedRound.scoringBreakdown.mapWins}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tournament Wins</div>
                    <div className="text-lg font-bold text-white">
                      {selectedRound.scoringBreakdown.tournamentWins}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Star Bonus</div>
                    <div className="text-lg font-bold text-[#F5C042]">
                      {selectedRound.scoringBreakdown.starBonus}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Lightweight Activity Feed */}
        <div className="space-y-4">
          <h3 className="text-lg font-gaming text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </h3>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {selectedRound.activityFeed.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex-1">
                      <div className="text-sm text-white">{activity.message}</div>
                      <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                    </div>
                    {activity.points && (
                      <div className={cn(
                        "text-sm font-bold",
                        activity.points > 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {activity.points > 0 ? '+' : ''}{activity.points}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};