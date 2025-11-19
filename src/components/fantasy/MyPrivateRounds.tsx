import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Copy, Check, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface PrivateRound {
  id: string;
  round_name: string | null;
  type: 'daily' | 'weekly' | 'monthly' | 'private';
  start_date: string;
  end_date: string;
  status: 'open' | 'active' | 'finished';
  join_code: string | null;
  max_participants: number | null;
  game_type: string | null;
  budget_cap: number | null;
}

interface MyPrivateRoundsProps {
  onSelectRound?: (round: any) => void;
}

export const MyPrivateRounds: React.FC<MyPrivateRoundsProps> = ({ onSelectRound }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<PrivateRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      fetchMyPrivateRounds();
    }
  }, [user]);

  const fetchMyPrivateRounds = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('fantasy_rounds')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_private', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const roundsData = (data || []) as PrivateRound[];
      setRounds(roundsData);

      // Fetch participant counts for each round
      const counts: Record<string, number> = {};
      for (const round of roundsData) {
        const { count, error: countError } = await supabase
          .from('fantasy_round_picks')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', round.id);
        
        if (!countError) {
          counts[round.id] = count || 0;
        }
      }
      setParticipantCounts(counts);
    } catch (err) {
      console.error('Error fetching private rounds:', err);
      toast.error('Failed to load your private rounds');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Join code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleViewRound = (round: PrivateRound, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectRound) {
      onSelectRound(round);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      open: { label: 'Open', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      active: { label: 'In Progress', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      finished: { label: 'Finished', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    };
    
    const variant = variants[status] || variants.open;
    return (
      <Badge className={`${variant.className} border`}>
        {variant.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your private rounds...</p>
      </div>
    );
  }

  if (!rounds.length) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p className="text-muted-foreground mb-4">
          You haven't created any private rounds yet
        </p>
        <Button
          onClick={() => navigate('/create-private-round')}
        >
          Create Your First Private Round
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rounds.map((round) => (
        <Card 
          key={round.id} 
          className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-gray-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-250 rounded-lg overflow-hidden cursor-pointer"
          onClick={(e) => handleViewRound(round, e)}
        >
          <CardContent className="p-5">
            {/* Status Badge */}
            <div className="mb-3">
              {getStatusBadge(round.status)}
            </div>

            {/* Round Name */}
            <h3 className="text-xl capitalize bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-semibold mb-3">
              {round.round_name || 'Private Round'}
            </h3>
            
            {/* Round Details */}
            <div className="space-y-2 text-sm text-gray-400 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(round.start_date).toLocaleDateString()} - {new Date(round.end_date).toLocaleDateString()}</span>
              </div>
              
              {round.game_type && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Game:</span>
                  <span className="capitalize">{round.game_type}</span>
                </div>
              )}

              {round.budget_cap && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Budget:</span>
                  <span>{round.budget_cap} credits</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  Participants: {participantCounts[round.id] || 0}
                  {round.max_participants ? ` / ${round.max_participants}` : ''}
                </span>
              </div>
            </div>

            {/* Join Code */}
            {round.join_code && (
              <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Join Code</p>
                    <p className="font-mono text-lg font-bold text-[#8B5CF6]">
                      {round.join_code}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => handleCopyCode(round.join_code!, e)}
                  >
                    {copiedCode === round.join_code ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              className="w-full"
              onClick={(e) => handleViewRound(round, e)}
            >
              <Eye className="h-4 w-4" />
              View Round
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
