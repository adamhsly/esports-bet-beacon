import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TeamPicker } from './TeamPicker';
import { toast } from 'sonner';

interface FantasyRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'open' | 'active' | 'finished';
  created_at: string;
}

interface RoundSelectorProps {
  onNavigateToInProgress?: () => void;
}

export const RoundSelector: React.FC<RoundSelectorProps> = ({ onNavigateToInProgress }) => {
  const [rounds, setRounds] = useState<FantasyRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<FantasyRound | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpenRounds();
  }, []);

  const fetchOpenRounds = async () => {
    try {
      const { data, error } = await supabase
        .from('fantasy_rounds')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRounds(
        data?.map((round) => ({
          ...round,
          type: round.type as 'daily' | 'weekly' | 'monthly',
          status: round.status as 'open' | 'active' | 'finished',
        })) || []
      );
    } catch (error) {
      console.error('Error fetching rounds:', error);
      toast.error('Failed to load fantasy rounds');
    } finally {
      setLoading(false);
    }
  };

  const getRoundTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'bg-blue-600 text-white';
      case 'weekly':
        return 'bg-green-600 text-white';
      case 'monthly':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));

    if (diffHours < 24) return `${diffHours}h`;
    if (diffHours < 168) return `${Math.round(diffHours / 24)}d`;
    return `${Math.round(diffHours / 168)}w`;
  };

  if (selectedRound) {
    return (
      <TeamPicker
        round={selectedRound}
        onBack={() => setSelectedRound(null)}
        onNavigateToInProgress={onNavigateToInProgress}
      />
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading fantasy rounds...</p>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Active Rounds</h3>
          <p className="text-muted-foreground">
            No fantasy rounds are currently open for registration. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Choose Your Round</h2>
        <p className="text-muted-foreground">
          Select a round format to join. Each format has different duration and scoring opportunities.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {rounds.map((round) => (
          <Card
            key={round.id}
            className="bg-gray-900 text-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">{round.type} Round</CardTitle>
                <Badge className={getRoundTypeColor(round.type)}>{round.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(round.start_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Duration: {calculateDuration(round.start_date, round.end_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>Teams: Up to 5 (Mix pro & amateur)</span>
                </div>

                <Button
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setSelectedRound(round)}
                >
                  Join Round
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
