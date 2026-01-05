import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Ticket, Trophy, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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
      // Fetch active and scheduled paid rounds
      const { data: roundsData, error: roundsError } = await supabase
        .from('fantasy_rounds')
        .select('id, round_name, type, status, entry_fee, start_date, end_date')
        .eq('is_paid', true)
        .in('status', ['scheduled', 'open'])
        .order('start_date');

      if (roundsError) throw roundsError;

      const roundsWithParticipants: PaidRound[] = [];

      for (const round of roundsData || []) {
        // Fetch reservations for this round
        const { data: reservations, error: resError } = await supabase
          .from('round_reservations')
          .select('user_id, created_at')
          .eq('round_id', round.id);

        if (resError) console.error('Error fetching reservations:', resError);

        // Fetch picks for this round
        const { data: picks, error: picksError } = await supabase
          .from('fantasy_round_picks')
          .select('user_id, created_at')
          .eq('round_id', round.id);

        if (picksError) console.error('Error fetching picks:', picksError);

        // Collect all unique user IDs
        const userIds = new Set<string>();
        (reservations || []).forEach(r => userIds.add(r.user_id));
        (picks || []).forEach(p => userIds.add(p.user_id));

        // Fetch user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', Array.from(userIds));

        if (profilesError) console.error('Error fetching profiles:', profilesError);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Build participants list
        const participants: RoundParticipant[] = [];

        // Add users with picks (these have submitted teams)
        const pickUserIds = new Set((picks || []).map(p => p.user_id));
        for (const pick of picks || []) {
          const profile = profileMap.get(pick.user_id);
          participants.push({
            user_id: pick.user_id,
            username: profile?.username || 'Unknown',
            type: 'pick',
            created_at: pick.created_at,
          });
        }

        // Add users with only reservations (no picks yet)
        for (const res of reservations || []) {
          if (!pickUserIds.has(res.user_id)) {
            const profile = profileMap.get(res.user_id);
            participants.push({
              user_id: res.user_id,
              username: profile?.username || 'Unknown',
              type: 'reservation',
              created_at: res.created_at,
            });
          }
        }

        roundsWithParticipants.push({
          ...round,
          participants: participants.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        });
      }

      setRounds(roundsWithParticipants);
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
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          No active or scheduled paid rounds found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        Paid Rounds Participants
      </h2>

      {rounds.map((round) => (
        <Card key={round.id} className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{round.round_name || `${round.type} Round`}</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(round.start_date), 'MMM d')} - {format(new Date(round.end_date), 'MMM d, yyyy')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={round.status === 'open' ? 'default' : 'secondary'}>
                  {round.status === 'open' ? 'Active' : 'Coming Soon'}
                </Badge>
                <Badge variant="outline">
                  £{((round.entry_fee || 0) / 100).toFixed(2)} entry
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {round.participants.length === 0 ? (
              <p className="text-muted-foreground text-sm">No participants yet.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Users className="h-4 w-4" />
                  {round.participants.length} participant{round.participants.length !== 1 ? 's' : ''}
                  <span className="mx-1">•</span>
                  <span className="text-green-500">
                    {round.participants.filter(p => p.type === 'pick').length} submitted
                  </span>
                  <span className="mx-1">•</span>
                  <span className="text-yellow-500">
                    {round.participants.filter(p => p.type === 'reservation').length} reserved only
                  </span>
                </div>
                <div className="grid gap-2">
                  {round.participants.map((participant) => (
                    <div
                      key={participant.user_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {participant.type === 'pick' ? (
                          <Trophy className="h-4 w-4 text-green-500" />
                        ) : (
                          <Ticket className="h-4 w-4 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{participant.username}</p>
                          <p className="text-xs text-muted-foreground">{participant.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={participant.type === 'pick' ? 'default' : 'outline'}
                          className={participant.type === 'pick' ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'border-yellow-500/30 text-yellow-500'}
                        >
                          {participant.type === 'pick' ? 'Team Submitted' : 'Reserved'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(participant.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
