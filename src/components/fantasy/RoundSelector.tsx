import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AuthModal from '@/components/AuthModal';

// Prize structure for each round type
const PRIZE_STRUCTURE = {
  daily: { first: '200', second: '100', third: '50', type: 'credits' },
  weekly: { first: '200', second: '100', third: '50', type: 'credits' },
  monthly: { first: '£100', second: '£30', third: '£5', type: 'steam' },
};

interface Round {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'open' | 'in_progress' | 'finished';
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
    {children}
  </h2>
);

const RoundCard: React.FC<{ 
  round?: Round; 
  type: 'daily' | 'weekly' | 'monthly' | 'private';
  onClick: () => void;
}> = ({ round, type, onClick }) => {
  const getRoundImage = (roundType: string) => {
    switch (roundType) {
      case 'daily': return 'lovable-uploads/daily_round.png';
      case 'weekly': return 'lovable-uploads/weekly_round.png';
      case 'monthly': return 'lovable-uploads/monthly_round.png';
      case 'private': return '/lovable-uploads/private_round.png';
      default: return '/images/rounds/default.jpg';
    }
  };

  if (type === 'private') {
    return (
      <Card 
        className="relative cursor-pointer transition-all duration-250 hover:scale-[1.01] hover:shadow-md hover:ring-1 hover:ring-gray-400/30 bg-slate-700 border-gray-700/50 overflow-hidden"
        onClick={onClick}
      >
        {/* Mobile Layout */}
        <CardContent className="p-4 md:hidden flex flex-col items-center gap-3">
          {/* Title - Top Centered */}
          <h3 className="text-lg font-semibold text-white">Private Round</h3>
          
          {/* Private Round Logo */}
          <div className="relative p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
            <img
              src={getRoundImage('private')}
              alt="Private round"
              className="w-20 h-20 object-contain"
            />
          </div>
          
          {/* Description */}
          <p className="text-sm text-purple-300 text-center">Play your way - Create or join private leagues</p>

          {/* Button - Bottom Centered */}
          <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-sm py-2 mt-1">
            Enter
          </Button>
        </CardContent>

        {/* Desktop Layout */}
        <CardContent className="p-4 hidden md:flex items-center gap-4">
          {/* Private Round Logo */}
          <div className="flex-shrink-0">
            <div className="relative p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
              <img
                src={getRoundImage('private')}
                alt="Private round"
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>
          
          {/* Private Round Info */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Private Round</h3>
            <p className="text-sm text-purple-300">Play your way - Create or join private leagues</p>
          </div>

          {/* Private Round Button */}
          <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-sm px-6">
            Enter
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!round) return null;

  const prizeInfo = PRIZE_STRUCTURE[round.type as keyof typeof PRIZE_STRUCTURE];

  const isInProgress = () => {
    const now = new Date();
    const start = new Date(round.start_date);
    const end = new Date(round.end_date);
    return now >= start && now <= end;
  };

  return (
    <Card 
      className="relative cursor-pointer transition-all duration-250 hover:scale-[1.01] hover:shadow-md hover:ring-1 hover:ring-gray-400/30 bg-slate-700 border-gray-700/50 overflow-hidden"
      onClick={onClick}
    >
      {/* Status Pill */}
      {isInProgress() && (
        <div className="absolute top-2 right-2 z-10">
          <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
            In Progress
          </span>
        </div>
      )}

      {/* Mobile Layout */}
      <CardContent className="p-4 md:hidden flex flex-col items-center gap-3">
        {/* Round Logo */}
        <div className="relative p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
          <img
            src={getRoundImage(round.type)}
            alt={`${round.type} round`}
            className="w-20 h-20 object-contain"
          />
        </div>
        
        {/* Prize Pool - Larger */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span className="text-base font-semibold text-yellow-400">
              {prizeInfo?.type === 'steam' ? 'Steam Vouchers' : 'Credits'}
            </span>
          </div>
          <div className="flex items-center justify-center gap-4 text-lg font-semibold">
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">🥇</span>
              <span className="text-gray-200">{prizeInfo?.first}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-400">🥈</span>
              <span className="text-gray-200">{prizeInfo?.second}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-orange-400">🥉</span>
              <span className="text-gray-200">{prizeInfo?.third}</span>
            </span>
          </div>
          <p className="text-sm text-green-400 font-medium mt-2">Free to play</p>
        </div>

        {/* Dates - Single Row */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Start: {new Date(round.start_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>End: {new Date(round.end_date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Join Button - Bottom Centered */}
        <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-sm py-2 mt-1">
          Join Round
        </Button>
      </CardContent>

      {/* Desktop Layout */}
      <CardContent className="p-4 hidden md:flex items-center gap-4">
        {/* Round Logo */}
        <div className="flex-shrink-0">
          <div className="relative p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
            <img
              src={getRoundImage(round.type)}
              alt={`${round.type} round`}
              className="w-20 h-20 object-contain"
            />
          </div>
        </div>
        
        {/* Round Info */}
        <div className="flex-1 min-w-0">
          {/* Prize Pool */}
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="h-6 w-6 text-yellow-400 flex-shrink-0" />
            <span className="text-base font-semibold text-yellow-400">
              {prizeInfo?.type === 'steam' ? 'Steam Vouchers' : 'Credits'}
            </span>
            <div className="flex items-center gap-4 text-base font-semibold">
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">🥇</span>
                <span className="text-gray-200">{prizeInfo?.first}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-gray-400">🥈</span>
                <span className="text-gray-200">{prizeInfo?.second}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-orange-400">🥉</span>
                <span className="text-gray-200">{prizeInfo?.third}</span>
              </span>
            </div>
          </div>

          {/* Free to play */}
          <p className="text-sm text-green-400 font-medium mb-1 text-left">Free to play</p>

          {/* Dates */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Start: {new Date(round.start_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>End: {new Date(round.end_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Join Button */}
        <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-sm px-6 flex-shrink-0">
          Join Round
        </Button>
      </CardContent>
    </Card>
  );
};

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
        .eq('is_private', false)
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

  const handleJoinRound = (round: Round) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    onJoinRound ? onJoinRound(round) : onNavigateToInProgress?.();
  };

  const handlePrivateRound = () => {
    window.location.href = '/fantasy/private';
  };

  // Categorize rounds by type
  const monthlyRounds = rounds.filter(r => r.type === 'monthly');
  const dailyRounds = rounds.filter(r => r.type === 'daily');
  const weeklyRounds = rounds.filter(r => r.type === 'weekly');

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading rounds...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Win Vouchers Section - Monthly */}
        <section>
          <SectionHeading>Win Vouchers</SectionHeading>
          <div className="space-y-3">
            {monthlyRounds.length > 0 ? (
              monthlyRounds.map((round) => (
                <RoundCard 
                  key={round.id} 
                  round={round} 
                  type={round.type}
                  onClick={() => handleJoinRound(round)} 
                />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No monthly rounds available.</p>
            )}
          </div>
        </section>

        {/* Quick Fire Section - Daily & Weekly */}
        <section>
          <SectionHeading>Quick Fire</SectionHeading>
          <div className="space-y-3">
            {dailyRounds.map((round) => (
              <RoundCard 
                key={round.id} 
                round={round} 
                type={round.type}
                onClick={() => handleJoinRound(round)} 
              />
            ))}
            {weeklyRounds.map((round) => (
              <RoundCard 
                key={round.id} 
                round={round} 
                type={round.type}
                onClick={() => handleJoinRound(round)} 
              />
            ))}
            {dailyRounds.length === 0 && weeklyRounds.length === 0 && (
              <p className="text-muted-foreground text-sm">No daily or weekly rounds available.</p>
            )}
          </div>
        </section>

        {/* Private Leagues Section */}
        <section>
          <SectionHeading>Private Leagues</SectionHeading>
          <div className="space-y-3">
            <RoundCard 
              type="private"
              onClick={handlePrivateRound} 
            />
          </div>
        </section>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  );
};
