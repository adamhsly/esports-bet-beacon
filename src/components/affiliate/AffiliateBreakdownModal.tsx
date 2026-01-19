import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, UserX, Calendar, GamepadIcon, TrendingUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AffiliateBreakdownModalProps {
  affiliate: {
    id: string;
    name: string;
    email: string;
    referral_code: string;
    tier: string;
    status: string;
    compensation_type?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReferredUser {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  rounds_played: number;
  activated: boolean;
}

interface AffiliateStats {
  totalReferred: number;
  activated: number;
  pending: number;
  totalRoundsPlayed: number;
}

const AffiliateBreakdownModal: React.FC<AffiliateBreakdownModalProps> = ({
  affiliate,
  open,
  onOpenChange,
}) => {
  const [users, setUsers] = useState<ReferredUser[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalReferred: 0,
    activated: 0,
    pending: 0,
    totalRoundsPlayed: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && affiliate) {
      fetchAffiliateData();
    }
  }, [open, affiliate]);

  const fetchAffiliateData = async () => {
    if (!affiliate) return;
    
    setLoading(true);
    try {
      // Fetch all profiles with this referral code
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, created_at')
        .eq('referrer_code', affiliate.referral_code);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Fetch activations for this affiliate
      const { data: activations, error: activationsError } = await supabase
        .from('affiliate_activations')
        .select('user_id, activated, first_round_played_at')
        .eq('creator_id', affiliate.id);

      if (activationsError) {
        console.error('Error fetching activations:', activationsError);
      }

      // Create activation lookup map
      const activationMap = new Map(
        (activations || []).map(a => [a.user_id, a])
      );

      // Fetch round counts for all referred users
      const userIds = (profiles || []).map(p => p.id);
      
      let roundCounts: Record<string, number> = {};
      if (userIds.length > 0) {
        const { data: rounds, error: roundsError } = await supabase
          .from('fantasy_round_picks')
          .select('user_id')
          .in('user_id', userIds);

        if (!roundsError && rounds) {
          rounds.forEach(r => {
            roundCounts[r.user_id] = (roundCounts[r.user_id] || 0) + 1;
          });
        }
      }

      // Fetch auth user data for last sign in (using profiles join with auth - we'll estimate from activity)
      // Since we can't directly access auth.users, we'll use the latest round pick as last activity
      let lastActivityMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: latestPicks } = await supabase
          .from('fantasy_round_picks')
          .select('user_id, updated_at')
          .in('user_id', userIds)
          .order('updated_at', { ascending: false });

        if (latestPicks) {
          latestPicks.forEach(p => {
            if (!lastActivityMap[p.user_id]) {
              lastActivityMap[p.user_id] = p.updated_at;
            }
          });
        }
      }

      // Build user list with enriched data
      const enrichedUsers: ReferredUser[] = (profiles || []).map(profile => {
        const activation = activationMap.get(profile.id);
        return {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          email: null, // We don't have access to auth emails directly
          created_at: profile.created_at,
          last_sign_in_at: lastActivityMap[profile.id] || null,
          rounds_played: roundCounts[profile.id] || 0,
          activated: activation?.activated || false,
        };
      });

      // Sort by registration date (newest first)
      enrichedUsers.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setUsers(enrichedUsers);

      // Calculate stats
      const totalReferred = enrichedUsers.length;
      const activated = enrichedUsers.filter(u => u.activated).length;
      const pending = totalReferred - activated;
      const totalRoundsPlayed = enrichedUsers.reduce((sum, u) => sum + u.rounds_played, 0);

      setStats({
        totalReferred,
        activated,
        pending,
        totalRoundsPlayed,
      });

    } catch (err) {
      console.error('Error fetching affiliate data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!affiliate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            {affiliate.name} - User Acquisition
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-purple-300 border-purple-500/50">
              {affiliate.referral_code}
            </Badge>
            <Badge className={affiliate.tier === 'gold' ? 'bg-yellow-500' : affiliate.tier === 'silver' ? 'bg-gray-400' : 'bg-amber-700'}>
              {affiliate.tier}
            </Badge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">
            Loading affiliate data...
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <Card className="bg-background/30 border-purple-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.totalReferred}</p>
                      <p className="text-xs text-muted-foreground">Total Referred</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background/30 border-green-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.activated}</p>
                      <p className="text-xs text-muted-foreground">Activated</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background/30 border-yellow-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <UserX className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background/30 border-blue-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <GamepadIcon className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.totalRoundsPlayed}</p>
                      <p className="text-xs text-muted-foreground">Total Rounds</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Rate */}
            <div className="mt-4 p-3 bg-background/20 rounded-lg border border-border/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Conversion Rate:</span>
                <span className="text-lg font-bold text-green-400">
                  {stats.totalReferred > 0 
                    ? ((stats.activated / stats.totalReferred) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
            </div>

            {/* Users Table */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Referred Users ({users.length})
              </h3>
              
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users referred yet
                </div>
              ) : (
                <div className="border border-border/30 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30 hover:bg-transparent">
                        <TableHead className="text-muted-foreground">User</TableHead>
                        <TableHead className="text-muted-foreground">Reg Date</TableHead>
                        <TableHead className="text-muted-foreground">Last Activity</TableHead>
                        <TableHead className="text-muted-foreground text-center">Rounds</TableHead>
                        <TableHead className="text-muted-foreground text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-border/30 hover:bg-background/30">
                          <TableCell className="font-medium text-white">
                            {user.username || user.full_name || user.id.slice(0, 8) + '...'}
                          </TableCell>
                          <TableCell className="text-white/70">
                            {formatDate(user.created_at)}
                          </TableCell>
                          <TableCell className="text-white/70">
                            {formatDateTime(user.last_sign_in_at)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={user.rounds_played > 0 ? 'text-blue-300 border-blue-500/50' : 'text-white/50 border-border/50'}>
                              {user.rounds_played}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {user.activated ? (
                              <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                                Activated
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AffiliateBreakdownModal;
