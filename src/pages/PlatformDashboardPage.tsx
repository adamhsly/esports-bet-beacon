import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, Users, DollarSign, TrendingUp, LogIn, Trophy, Calendar, Clock, CreditCard } from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

interface PeriodStats {
  newUsers: number;
  realRoundParticipants: number;
  roundEntryRealRevenue: number;
  roundEntryBonusUsed: number;
  battlePassRevenue: number;
  successfulLogins: number;
}

const PlatformDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  const [dailyStats, setDailyStats] = useState<PeriodStats>({ newUsers: 0, realRoundParticipants: 0, roundEntryRealRevenue: 0, roundEntryBonusUsed: 0, battlePassRevenue: 0, successfulLogins: 0 });
  const [weeklyStats, setWeeklyStats] = useState<PeriodStats>({ newUsers: 0, realRoundParticipants: 0, roundEntryRealRevenue: 0, roundEntryBonusUsed: 0, battlePassRevenue: 0, successfulLogins: 0 });
  const [monthlyStats, setMonthlyStats] = useState<PeriodStats>({ newUsers: 0, realRoundParticipants: 0, roundEntryRealRevenue: 0, roundEntryBonusUsed: 0, battlePassRevenue: 0, successfulLogins: 0 });
  
  const [allTimeStats, setAllTimeStats] = useState({
    totalUsers: 0,
    totalRealUsers: 0,
    totalRevenue: 0,
    totalRounds: 0,
  });

  // Check admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) return;

      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (err) {
        console.error('Error checking admin role:', err);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]);

  // Redirect non-admins
  useEffect(() => {
    if (authLoading) return;
    
    if (!checkingAdmin && !user) {
      navigate('/auth');
    } else if (!checkingAdmin && isAdmin === false) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [checkingAdmin, user, isAdmin, navigate, authLoading]);

  // Fetch data only if admin
  useEffect(() => {
    if (isAdmin === true) {
      fetchAllStats();
    }
  }, [isAdmin]);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      // Fetch all data in parallel
      const [
        dailyData,
        weeklyData,
        monthlyData,
        allTimeData
      ] = await Promise.all([
        fetchPeriodStats(todayStart),
        fetchPeriodStats(weekStart),
        fetchPeriodStats(monthStart),
        fetchAllTimeStats()
      ]);

      setDailyStats(dailyData);
      setWeeklyStats(weeklyData);
      setMonthlyStats(monthlyData);
      setAllTimeStats(allTimeData);
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodStats = async (startDate: Date): Promise<PeriodStats> => {
    const startStr = startDate.toISOString();

    // New users (non-test accounts)
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startStr)
      .or('test.is.null,test.eq.false');

    // Real users who joined rounds (non-test)
    const { data: roundPicks } = await supabase
      .from('fantasy_round_picks')
      .select('user_id')
      .gte('created_at', startStr);

    // Get unique user IDs and check if they're real users
    const userIds = [...new Set(roundPicks?.map(p => p.user_id) || [])];
    let realParticipants = 0;
    
    if (userIds.length > 0) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('id', userIds)
        .or('test.is.null,test.eq.false');
      realParticipants = count || 0;
    }

    // Round entry revenue - split between real funds and bonus used
    const { data: roundEntries } = await supabase
      .from('round_entries')
      .select('amount_paid, promo_used')
      .gte('created_at', startStr)
      .eq('status', 'completed');

    const roundRealRevenue = roundEntries?.reduce((sum, e) => sum + ((e.amount_paid || 0) - (e.promo_used || 0)), 0) || 0;
    const roundBonusUsed = roundEntries?.reduce((sum, e) => sum + (e.promo_used || 0), 0) || 0;

    // Battle pass revenue
    const { data: premiumReceipts } = await supabase
      .from('premium_receipts')
      .select('amount_total')
      .gte('created_at', startStr);

    const battlePassRevenue = premiumReceipts?.reduce((sum, r) => sum + (r.amount_total || 0), 0) || 0;

    // Successful logins (users who logged in during this period)
    const { count: loginCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', startStr)
      .or('test.is.null,test.eq.false');

    return {
      newUsers: newUsers || 0,
      realRoundParticipants: realParticipants,
      roundEntryRealRevenue: roundRealRevenue,
      roundEntryBonusUsed: roundBonusUsed,
      battlePassRevenue: battlePassRevenue,
      successfulLogins: loginCount || 0,
    };
  };

  const fetchAllTimeStats = async () => {
    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Total real users (non-test)
    const { count: totalRealUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('test.is.null,test.eq.false');

    // Total revenue from round entries
    const { data: allRoundEntries } = await supabase
      .from('round_entries')
      .select('amount_paid')
      .eq('status', 'completed');

    const { data: allPremiumReceipts } = await supabase
      .from('premium_receipts')
      .select('amount_total');

    const roundRevenue = allRoundEntries?.reduce((sum, e) => sum + (e.amount_paid || 0), 0) || 0;
    const premiumRevenue = allPremiumReceipts?.reduce((sum, r) => sum + (r.amount_total || 0), 0) || 0;

    // Total rounds
    const { count: totalRounds } = await supabase
      .from('fantasy_rounds')
      .select('*', { count: 'exact', head: true });

    return {
      totalUsers: totalUsers || 0,
      totalRealUsers: totalRealUsers || 0,
      totalRevenue: roundRevenue + premiumRevenue,
      totalRounds: totalRounds || 0,
    };
  };

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  const getCurrentStats = () => {
    switch (selectedPeriod) {
      case 'day': return dailyStats;
      case 'week': return weeklyStats;
      case 'month': return monthlyStats;
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
    }
  };

  // Show loading while auth or admin status is being checked
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SearchableNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 animate-pulse">
            <Shield className="h-5 w-5" />
            <span>Checking admin permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const currentStats = getCurrentStats();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-screen">
      <SearchableNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-8 md:py-16">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-blue-900/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-3 relative z-10 max-w-full">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 md:h-10 md:w-10 text-emerald-400" />
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Platform Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground mb-8 text-sm md:text-base">Performance metrics and analytics</p>

          {/* All-Time Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-emerald-500/30 hover:border-emerald-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-emerald-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{allTimeStats.totalRealUsers.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-white/70">Real Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30 hover:border-blue-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 md:h-8 md:w-8 text-blue-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{allTimeStats.totalRounds.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-white/70">Total Rounds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-green-500/30 hover:border-green-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(allTimeStats.totalRevenue)}</p>
                    <p className="text-xs md:text-sm text-white/70">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 hover:border-purple-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-purple-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{allTimeStats.totalUsers.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-white/70">All Accounts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="py-8 md:py-12 bg-gradient-to-br from-[#0B0F14] to-[#12161C]">
        <div className="container mx-auto px-3 max-w-full">
          
          {/* Period Selector */}
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'day' | 'week' | 'month')} className="space-y-6">
            <TabsList className="bg-[#0B0F14] border border-border/50">
              <TabsTrigger value="day" className="text-white data-[state=active]:text-white data-[state=active]:bg-emerald-600">
                <Calendar className="h-4 w-4 mr-2" /> Today
              </TabsTrigger>
              <TabsTrigger value="week" className="text-white data-[state=active]:text-white data-[state=active]:bg-emerald-600">
                <Clock className="h-4 w-4 mr-2" /> This Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-white data-[state=active]:text-white data-[state=active]:bg-emerald-600">
                <Calendar className="h-4 w-4 mr-2" /> This Month
              </TabsTrigger>
            </TabsList>

            {['day', 'week', 'month'].map((period) => (
              <TabsContent key={period} value={period} className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-pulse text-muted-foreground">Loading stats...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* New Users */}
                    <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-emerald-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                          <Users className="h-4 w-4" /> New Users
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white">{currentStats.newUsers.toLocaleString()}</p>
                        <p className="text-xs text-white/50 mt-1">Real accounts (non-test)</p>
                      </CardContent>
                    </Card>

                    {/* Round Participants */}
                    <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                          <Trophy className="h-4 w-4" /> Round Participants
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white">{currentStats.realRoundParticipants.toLocaleString()}</p>
                        <p className="text-xs text-white/50 mt-1">Unique real users who joined a round</p>
                      </CardContent>
                    </Card>

                    {/* Successful Logins */}
                    <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                          <LogIn className="h-4 w-4" /> Successful Logins
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white">{currentStats.successfulLogins.toLocaleString()}</p>
                        <p className="text-xs text-white/50 mt-1">Real users who logged in</p>
                      </CardContent>
                    </Card>

                    {/* Round Entry Real Revenue */}
                    <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-green-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" /> Real Revenue (Round Entries)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white">{formatCurrency(currentStats.roundEntryRealRevenue)}</p>
                        <p className="text-xs text-white/50 mt-1">Actual money paid</p>
                      </CardContent>
                    </Card>

                    {/* Round Entry Bonus Used */}
                    <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-orange-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> Bonus Used (Round Entries)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white">{formatCurrency(currentStats.roundEntryBonusUsed)}</p>
                        <p className="text-xs text-white/50 mt-1">Promo credits redeemed</p>
                      </CardContent>
                    </Card>

                    {/* Battle Pass Revenue */}
                    <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> Battle Pass Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white">{formatCurrency(currentStats.battlePassRevenue)}</p>
                        <p className="text-xs text-white/50 mt-1">Premium pass purchases</p>
                      </CardContent>
                    </Card>

                    {/* Total Period Revenue */}
                    <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-emerald-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" /> Total Real Revenue ({getPeriodLabel()})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white">
                          {formatCurrency(currentStats.roundEntryRealRevenue + currentStats.battlePassRevenue)}
                        </p>
                        <p className="text-xs text-white/50 mt-1">Real money collected</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlatformDashboardPage;
