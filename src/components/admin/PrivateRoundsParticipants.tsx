import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trophy, Calendar, Lock, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RoundParticipant {
  user_id: string;
  username: string;
  email: string | null;
  created_at: string;
}

interface PrivateRound {
  id: string;
  round_name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  join_code: string;
  organiser_id: string;
  organiser_username: string;
  organiser_email: string | null;
  participants: RoundParticipant[];
}

export function PrivateRoundsParticipants() {
  const [rounds, setRounds] = useState<PrivateRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrivateRoundsWithParticipants();
  }, []);

  async function fetchPrivateRoundsWithParticipants() {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('get_private_round_participants');
      
      if (error) {
        console.error('Error fetching private rounds:', error);
        return;
      }

      const parsedRounds: PrivateRound[] = (data || []).map((round: any) => ({
        id: round.id,
        round_name: round.round_name,
        type: round.type,
        status: round.status,
        start_date: round.start_date,
        end_date: round.end_date,
        join_code: round.join_code,
        organiser_id: round.organiser_id,
        organiser_username: round.organiser_username,
        organiser_email: round.organiser_email,
        participants: round.participants || [],
      }));

      setRounds(parsedRounds);
    } catch (error) {
      console.error('Error fetching private rounds:', error);
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
          No active or scheduled private rounds found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lock className="h-8 w-8 text-purple-400" />
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Private Rounds Participants
        </h2>
      </div>

      <div className="grid gap-4">
        {rounds.map((round) => {
          const participantCount = round.participants.length;

          return (
            <Card 
              key={round.id} 
              className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 hover:border-purple-500/50 transition-all"
            >
              <CardContent className="p-4 md:p-6">
                {/* Round Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Lock className="h-6 w-6 text-purple-400 shrink-0" />
                    <div>
                      <h3 className="font-bold text-white">{round.round_name || `Private ${round.type} Round`}</h3>
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
                        round.status === 'open' || round.status === 'in_progress'
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      )}
                    >
                      {round.status === 'open' || round.status === 'in_progress' ? 'Active' : 'Scheduled'}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-white/20 text-white/70 font-mono">
                      {round.join_code}
                    </Badge>
                  </div>
                </div>

                {/* Organiser Info */}
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <User className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-white/70">Organiser:</span>
                  <span className="font-medium text-white">{round.organiser_username || 'Unknown'}</span>
                  {round.organiser_email && (
                    <span className="text-xs text-white/50">({round.organiser_email})</span>
                  )}
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-white">{participantCount}</p>
                    <p className="text-xs text-white/60">Participants</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{participantCount}</p>
                    <p className="text-xs text-emerald-400/70">Teams Submitted</p>
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
                        <div className="flex items-center gap-3 min-w-0">
                          <Trophy className="h-4 w-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-white">{participant.username || 'Unknown'}</p>
                            <p className="text-xs text-white/60 truncate">{participant.email || participant.user_id.slice(0, 8) + '...'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Submitted
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
