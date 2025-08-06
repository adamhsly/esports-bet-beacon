import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetchOpenRounds();
  }, [user]);

  const fetchOpenRounds = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('fantasy_rounds')
        .select('*')
        .eq('status', 'open')
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {rounds.map((round) => (
        <Card key={round.id} className="overflow-hidden bg-card border-border hover:shadow-lg transition-shadow">
          <img
            src={getRoundImage(round.type)}
            alt={`${round.type} round`}
            className="w-full h-32 object-contain bg-card rounded-t-lg"
          />
          <CardHeader className="pt-4" />
          <CardContent>
            <div className="mb-4 flex flex-col gap-1 text-sm text-muted-foreground">
              <span>
                <Calendar className="inline mr-2" />
                Start: {new Date(round.start_date).toLocaleDateString()}
              </span>
              <span>
                <Calendar className="inline mr-2" />
                End: {new Date(round.end_date).toLocaleDateString()}
              </span>
            </div>

            <Button
              className="w-full"
              onClick={() => onJoinRound ? onJoinRound(round) : onNavigateToInProgress?.()}
            >
              Join Round
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
