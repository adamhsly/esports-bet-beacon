import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export const RoundSelector: React.FC<{ onNavigateToInProgress?: () => void }> = ({ onNavigateToInProgress }) => {
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
      setRounds(data || []);
    } catch (err) {
      console.error('Error fetching rounds:', err);
      toast.error('Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };

  const getRoundTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-600 text-white';
      case 'weekly': return 'bg-green-600 text-white';
      case 'monthly': return 'bg-purple-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoundImage = (type: string) => {
    switch (type) {
      case 'daily': return '/images/rounds/daily.jpg';
      case 'weekly': return '/images/rounds/weekly.jpg';
      case 'monthly': return '/images/rounds/monthly.jpg';
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
        <Card key={round.id} className="overflow-hidden">
          <img
            src={getRoundImage(round.type)}
            alt={`${round.type} round`}
            className="w-full h-40 object-cover rounded-t-md"
          />
          <CardHeader className="pt-4">
            <CardTitle className="flex justify-between items-center">
              <span>{round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round</span>
              <Badge className={getRoundTypeColor(round.type)}>{round.type}</Badge>
            </CardTitle>
          </CardHeader>
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
              className="w-full text-white"
              style={{ backgroundColor: '#8b5cf6' }}
              onClick={onNavigateToInProgress}
            >
              Join Round
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
