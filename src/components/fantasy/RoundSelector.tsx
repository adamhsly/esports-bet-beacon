import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AuthModal from '@/components/AuthModal';

// Prize structure for each round type
const PRIZE_STRUCTURE = {
  daily: { first: 200, second: 100, third: 50 },
  weekly: { first: 200, second: 100, third: 50 },
  monthly: { first: 200, second: 100, third: 50 },
};

interface Round {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'open' | 'in_progress' | 'finished';
}

export const RoundSelector: React.FC<{ onNavigateToInProgress?: () => void; onJoinRound?: (round: Round) => void }> = ({ onNavigateToInProgress, onJoinRound }) => {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetchOpenRounds();
  }, []);

  const fetchOpenRounds = async () => {
    try {
      const { data, error } = await supabase
        .from('fantasy_rounds')
        .select('*')
        .eq('status', 'open')
        .eq('is_private', false) // Only fetch public rounds
        .order('start_date', { ascending: true });

      if (error) throw error;
      setRounds((data || []) as Round[]);
    } catch (err) {
      console.error('Error fetching rounds:', err);
      toast.error('Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };

  const getRoundImage = (type: string) => {
    switch (type) {
      case 'daily': return 'lovable-uploads/daily_round.png';
      case 'weekly': return 'lovable-uploads/weekly_round.png';
      case 'monthly': return 'lovable-uploads/monthly_round.png';
      default: return '/images/rounds/default.jpg';
    }
  };

  const handleJoinRound = (round: Round) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    onJoinRound ? onJoinRound(round) : onNavigateToInProgress?.();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading rounds...</p>
      </div>
    );
  }

  if (!rounds.length) {
    return <p className="text-center text-muted-foreground">No open rounds available.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        {rounds.map((round) => (
          <Card 
            key={round.id} 
            className="relative cursor-pointer transition-all duration-250 hover:scale-[1.02] hover:shadow-md hover:ring-1 hover:ring-gray-400/30 bg-slate-700 border-gray-700/50 overflow-hidden"
            onClick={() => handleJoinRound(round)}
          >
            <CardContent className="p-4">
              {/* Round Logo */}
              <div className="flex justify-center mb-3">
                <div className="relative p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
                  <img
                    src={getRoundImage(round.type)}
                    alt={`${round.type} round`}
                    className="w-24 h-24 object-contain"
                  />
                </div>
              </div>
              
              {/* Prize Pool */}
              <div className="mb-3">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs font-medium text-yellow-400">Prizes</span>
                </div>
                <div className="flex justify-center gap-2 text-xs">
                  <div className="flex items-center gap-0.5">
                    <span className="text-yellow-400">🥇</span>
                    <span className="text-gray-300">{PRIZE_STRUCTURE[round.type as keyof typeof PRIZE_STRUCTURE]?.first || 200}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-gray-400">🥈</span>
                    <span className="text-gray-300">{PRIZE_STRUCTURE[round.type as keyof typeof PRIZE_STRUCTURE]?.second || 100}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-orange-400">🥉</span>
                    <span className="text-gray-300">{PRIZE_STRUCTURE[round.type as keyof typeof PRIZE_STRUCTURE]?.third || 50}</span>
                  </div>
                </div>
              </div>

              {/* Round Info */}
              <div className="text-center mb-3">
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Start: {new Date(round.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>End: {new Date(round.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Join Button */}
              <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-sm py-2">
                Join Round
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Private Round Card */}
        <Card 
          className="relative cursor-pointer transition-all duration-250 hover:scale-[1.02] hover:shadow-md hover:ring-1 hover:ring-gray-400/30 bg-slate-700 border-gray-700/50 overflow-hidden"
          onClick={() => window.location.href = '/fantasy/private'}
        >
          <CardContent className="p-4">
            {/* Private Round Logo */}
            <div className="flex justify-center mb-3">
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                <img
                  src="/lovable-uploads/private_round.png"
                  alt="Private round"
                  className="w-24 h-24 object-contain"
                />
              </div>
            </div>
            
            {/* Private Round Info */}
            <div className="text-center mb-3">
              <p className="text-sm text-purple-300 font-medium">Private round - Play your way</p>
            </div>

            {/* Private Round Button */}
            <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-sm py-2">
              Private round
            </Button>
          </CardContent>
        </Card>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  );
};
