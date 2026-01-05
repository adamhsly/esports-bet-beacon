import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Ticket, Trophy, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RoundParticipant {
  user_id: string;
  username: string;
  type: 'reservation' | 'pick';
  created_at: string;
}

interface PaidRound {
  id: string;
  round_name: string;
  type: string;
  status: string;
  entry_fee: number;
  start_date: string;
  end_date: string;
  participants: RoundParticipant[];
}

export function PaidRoundsParticipants() {
  const [rounds, setRounds] = useState<PaidRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaidRoundsWithParticipants();
  }, []);

  async function fetchPaidRoundsWithParticipants() {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('get_paid_round_participants');
      
      if (error) {
        console.error('Error fetching paid rounds:', error);
        return;
      }

      // Parse the result
      const parsedRounds: PaidRound[] = (data || []).map((round: any) => ({
        id: round.id,
        round_name: round.round_name,
        type: round.type,
        status: round.status,
        entry_fee: round.entry_fee,
        start_date: round.start_date,
        end_date: round.end_date,
        participants: round.participants || [],
      }));

      setRounds(parsedRounds);
    } catch (error) {
      console.error('Error fetching paid rounds:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-border/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          No active or scheduled paid rounds found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-emerald-400" />
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
          Paid Rounds Participants
        </h2>
      </div>

      <div className="grid gap-4">
        {rounds.map((round) => {
          const reservedCount = round.participants.filter(p => p.type === 'reservation').length;
          const submittedCount = round.participants.filter(p => p.type === 'pick').length;
          const totalCount = round.participants.length;

          return (
            <Card 
              key={round.id} 
              className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-cyan-500/30 hover:border-cyan-500/50 transition-all"
            >
              <CardContent className="p-4 md:p-6">
                {/* Round Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-cyan-400 shrink-0" />
                    <div>
                      <h3 className="font-bold text-white">{round.round_name || `${round.type} Round`}</h3>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(round.start_date), 'MMM d')} - {format(new Date(round.end_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      className={cn(
                        "text-xs",
                        round.status === 'open' 
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      )}
                    >
                      {round.status === 'open' ? 'Active' : 'Coming Soon'}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                      £{((round.entry_fee || 0) / 100).toFixed(2)} entry
                    </Badge>
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-white">{totalCount}</p>
                    <p className="text-xs text-white/60">Total</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{submittedCount}</p>
                    <p className="text-xs text-emerald-400/70">Submitted</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-yellow-400">{reservedCount}</p>
                    <p className="text-xs text-yellow-400/70">Reserved</p>
                  </div>
                </div>

                {/* Participants List */}
                {round.participants.length === 0 ? (
                  <p className="text-white/50 text-sm text-center py-4">No participants yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {round.participants.map((participant, idx) => (
                      <div
                        key={`${participant.user_id}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {participant.type === 'pick' ? (
                            <Trophy className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Ticket className="h-4 w-4 text-yellow-400" />
                          )}
                          <div>
                            <p className="font-medium text-white">{participant.username || 'Unknown'}</p>
                            <p className="text-xs text-white/40">{participant.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={cn(
                              "text-xs",
                              participant.type === 'pick' 
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            )}
                          >
                            {participant.type === 'pick' ? 'Submitted' : 'Reserved'}
                          </Badge>
                          <span className="text-xs text-white/40">
                            {format(new Date(participant.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
